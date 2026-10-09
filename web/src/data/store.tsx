import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState, type ReactNode } from "react";
import type { ActivityEvent, Agent, AgentStatus, Harness, HarnessSource, Incident, IncidentStatus, Policy, VulnStatus } from "./types";
import {
  agents as seedAgents,
  incidents as seedIncidents,
  liveIncidentTemplates,
  makeEvent,
  policies as seedPolicies,
  seedActivity,
  seedTrustTrend,
} from "./mock";
import { detectStack, mergeTriage, scanFiles, securityScore, type SourceFile } from "../scanner/scan";
import { fetchGitHubRepo, parseGitHubUrl, readUploads } from "../scanner/sources";

import { scanSource } from "./sourceApi";

interface FleetState {
  agents: Agent[];
  policies: Policy[];
  incidents: Incident[];
  activity: ActivityEvent[];
  harnesses: Harness[];
  trustTrend: ReturnType<typeof seedTrustTrend>;
  live: boolean;
  setLive: (v: boolean) => void;
  setAgentStatus: (id: string, status: AgentStatus) => void;
  setIncidentStatus: (id: string, status: IncidentStatus, action?: string) => void;
  togglePolicy: (id: string) => void;
  upsertPolicy: (p: Policy) => void;
  setVulnStatus: (harnessId: string, vulnId: string, status: VulnStatus) => void;
  /** Run Semgrep on a configured local checkout. */
  registerHarness: (h: Pick<Harness, "name" | "repo" | "language" | "framework" | "branch">) => Promise<void>;
  rescanHarness: (id: string) => Promise<void>;
  /** Register a GitHub repository and start scanning it. Returns the new id. */
  registerGitHub: (input: { url: string; name?: string; branch?: string; token?: string }) => string;
  /** Register uploaded source (zip, folder or files) and start scanning it. Returns the new id. */
  registerUpload: (input: { files: File[]; name?: string }) => string;
  rescanGitHub: (id: string, token?: string) => void;
  uploadNewVersion: (id: string, files: File[]) => void;
  removeHarness: (id: string) => void;
  linkAgent: (agentId: string, harnessId: string | undefined) => void;
}

const Ctx = createContext<FleetState | null>(null);

/* ---------- persistence (browser only; wrapped so the app still works without storage) ---------- */
const HKEY = "fleetguardian.harnesses.v1";
const LKEY = "fleetguardian.agentLinks.v1";

function load<T>(key: string, fallback: T): T {
  try {
    const raw = localStorage.getItem(key);
    return raw ? (JSON.parse(raw) as T) : fallback;
  } catch {
    return fallback;
  }
}
function save(key: string, value: unknown) {
  try {
    localStorage.setItem(key, JSON.stringify(value));
  } catch {
    /* storage full or blocked: keep working in memory */
  }
}

function initialHarnesses(): Harness[] {
  return load<Harness[]>(HKEY, []).map((h) =>
    h.status === "scanning" || h.status === "queued"
      ? { ...h, status: "error", error: "Scan was interrupted (page reloaded). Rescan to try again.", progress: undefined }
      : h,
  );
}

export function FleetProvider({ children }: { children: ReactNode }) {
  const links = load<Record<string, string>>(LKEY, {});
  const [agents, setAgents] = useState<Agent[]>(() => seedAgents.map((a) => ({ ...a, harnessId: links[a.id] })));
  const [policies, setPolicies] = useState(seedPolicies);
  const [incidents, setIncidents] = useState(seedIncidents);
  const [activity, setActivity] = useState(seedActivity);
  const [harnesses, setHarnesses] = useState<Harness[]>(initialHarnesses);
  const [trustTrend] = useState(seedTrustTrend);
  const [live, setLive] = useState(true);
  const agentsRef = useRef(agents);
  agentsRef.current = agents;
  const harnessesRef = useRef(harnesses);
  harnessesRef.current = harnesses;
  /** GitHub tokens live only in memory for this tab, never in storage. */
  const tokens = useRef<Record<string, string>>({});

  useEffect(() => save(HKEY, harnesses.map(({ progress, ...h }) => h)), [harnesses]);
  useEffect(() => {
    const map: Record<string, string> = {};
    for (const a of agents) if (a.harnessId) map[a.id] = a.harnessId;
    save(LKEY, map);
  }, [agents]);

  const logIntervention = (agentId: string, summary: string) =>
    setActivity((a) => [{ id: `e-int-${Date.now()}`, time: Date.now(), agentId, kind: "intervention" as const, summary }, ...a].slice(0, 400));

  // Live simulation for the agent side of the fleet (agents/incidents are still sample data).
  useEffect(() => {
    if (!live) return;
    const t = setInterval(() => {
      const activeAgents = agentsRef.current.filter((a) => a.status === "active");
      if (activeAgents.length) {
        const pick = activeAgents[Math.floor(Math.random() * activeAgents.length)];
        const ev = makeEvent(pick.id);
        setActivity((acts) => [ev, ...acts].slice(0, 400));
        setAgents((prev) => prev.map((a) => (a.id === pick.id ? { ...a, lastSeen: Date.now(), tasksToday: a.tasksToday + 1 } : a)));
      }
      if (Math.random() < 0.08) {
        const tpl = liveIncidentTemplates[Math.floor(Math.random() * liveIncidentTemplates.length)];
        const inc: Incident = { ...tpl, id: `i-${Date.now()}`, time: Date.now(), status: "open" };
        setIncidents((list) => [inc, ...list]);
        setActivity((acts) => [{ id: `e-v-${inc.id}`, time: inc.time, agentId: inc.agentId, kind: "violation" as const, summary: inc.title }, ...acts]);
        setAgents((list) => list.map((a) => (a.id === inc.agentId ? { ...a, violations24h: a.violations24h + 1, trustScore: Math.max(0, a.trustScore - 2) } : a)));
      }
    }, 3500);
    return () => clearInterval(t);
  }, [live]);

  /* ---------- source code scanning ---------- */
  const patch = useCallback((id: string, p: Partial<Harness>) => setHarnesses((list) => list.map((h) => (h.id === id ? { ...h, ...p } : h))), []);

  const finishScan = useCallback(
    (id: string, files: SourceFile[], skipped: number) => {
      patch(id, { progress: { done: files.length, total: files.length, phase: "Analyzing" } });
      // yield so the UI can paint "Analyzing" before the synchronous scan
      setTimeout(() => {
        const { vulns, lines } = scanFiles(files);
        const stack = detectStack(files);
        const prev = harnessesRef.current.find((h) => h.id === id)?.vulns ?? [];
        const merged = mergeTriage(prev, vulns);
        patch(id, {
          status: "ready",
          progress: undefined,
          error: files.length ? undefined : "No source files found to scan.",
          vulns: merged,
          securityScore: securityScore(merged),
          fileCount: files.length,
          linesScanned: lines,
          language: stack.language,
          framework: stack.framework,
          lastScan: Date.now(),
          ...(skipped ? { error: `${skipped} files were skipped (too large, unsupported or over the file limit).` } : {}),
        });
      }, 30);
    },
    [patch],
  );

  const runGitHubScan = useCallback(
    async (id: string, src: Extract<HarnessSource, { kind: "github" }>, token?: string) => {
      patch(id, { status: "scanning", error: undefined, progress: { done: 0, total: 1, phase: "Starting" } });
      try {
        const res = await fetchGitHubRepo(src.url, {
          branch: src.branch,
          token,
          onProgress: (done, total, phase) => patch(id, { progress: { done, total, phase } }),
        });
        patch(id, { branch: res.branch, source: { ...src, branch: res.branch } });
        finishScan(id, res.files, res.skipped);
      } catch (e) {
        patch(id, { status: "error", progress: undefined, error: e instanceof Error ? e.message : String(e) });
      }
    },
    [patch, finishScan],
  );

  const runUploadScan = useCallback(
    async (id: string, files: File[]) => {
      patch(id, { status: "scanning", error: undefined, progress: { done: 0, total: files.length, phase: "Reading files" } });
      try {
        const res = await readUploads(files, (done, total, phase) => patch(id, { progress: { done, total, phase } }));
        patch(id, { source: { kind: "upload", label: res.label }, repo: `Uploaded · ${res.label}` });
        finishScan(id, res.files, res.skipped);
      } catch (e) {
        patch(id, { status: "error", progress: undefined, error: e instanceof Error ? e.message : String(e) });
      }
    },
    [patch, finishScan],
  );

  const blank = (id: string, name: string, source: HarnessSource, repo: string, branch: string): Harness => ({
    id, name, source, repo, branch, language: "—", framework: "—", status: "queued",
    fileCount: 0, linesScanned: 0, lastScan: Date.now(), securityScore: 100, vulns: [],
  });

  const value = useMemo<FleetState>(
    () => ({
      agents, policies, incidents, activity, harnesses, trustTrend, live, setLive,
      setAgentStatus: (id, status) => {
        setAgents((list) => list.map((a) => (a.id === id ? { ...a, status } : a)));
        const verb = { active: "Resumed", paused: "Paused", quarantined: "Quarantined", idle: "Set idle" }[status];
        logIntervention(id, `${verb} by operator`);
      },
      setIncidentStatus: (id, status, action) =>
        setIncidents((list) => list.map((i) => (i.id === id ? { ...i, status, actionTaken: action ?? i.actionTaken } : i))),
      togglePolicy: (id) => setPolicies((list) => list.map((p) => (p.id === id ? { ...p, enabled: !p.enabled, updatedAt: Date.now() } : p))),
      upsertPolicy: (p) => setPolicies((list) => (list.some((x) => x.id === p.id) ? list.map((x) => (x.id === p.id ? p : x)) : [p, ...list])),
      setVulnStatus: (hid, vid, status) =>
        setHarnesses((list) =>
          list.map((h) => {
            if (h.id !== hid) return h;
            const vulns = h.vulns.map((v) => (v.id === vid ? { ...v, status } : v));
            return { ...h, vulns, securityScore: h.scan ? h.securityScore : securityScore(vulns) };
          }),
        ),

      registerHarness: async (h) => {
        const report = await scanSource(h);
        const entry: Harness = {
          ...h, ...report, id: crypto.randomUUID(), source: { kind: "local", url: h.repo, branch: h.branch },
          status: "ready", fileCount: report.scan?.filesScanned ?? 0, linesScanned: 0,
        };
        setHarnesses((list) => [entry, ...list]);
      },
      rescanHarness: async (id) => {
        const h = harnessesRef.current.find((x) => x.id === id);
        if (!h || h.source.kind !== "local") return;
        patch(id, { status: "scanning", error: undefined, progress: { done: 0, total: 1, phase: "Semgrep" } });
        try {
          const report = await scanSource(h);
          patch(id, { ...report, status: "ready", progress: undefined, fileCount: report.scan?.filesScanned ?? 0 });
        } catch (error) {
          patch(id, { status: "error", progress: undefined, error: `${error instanceof Error ? error.message : "Scan failed."} Previous results retained.` });
        }
      },
      registerGitHub: ({ url, name, branch, token }) => {
        const p = parseGitHubUrl(url);
        const id = `h-${Date.now().toString(36)}`;
        const src: HarnessSource = { kind: "github", url: url.trim(), owner: p?.owner ?? "", repo: p?.repo ?? "", branch: branch?.trim() || p?.branch || "" };
        setHarnesses((list) => [blank(id, name?.trim() || p?.repo || url, src, p ? `github.com/${p.owner}/${p.repo}` : url, src.branch || "default"), ...list]);
        if (token) tokens.current[id] = token;
        void runGitHubScan(id, src, token);
        return id;
      },
      registerUpload: ({ files, name }) => {
        const id = `h-${Date.now().toString(36)}`;
        const guess = files[0]?.name.replace(/\.zip$/i, "") || "uploaded-source";
        setHarnesses((list) => [blank(id, name?.trim() || guess, { kind: "upload", label: guess }, "Uploaded source", "—"), ...list]);
        void runUploadScan(id, files);
        return id;
      },
      rescanGitHub: (id, token) => {
        const h = harnessesRef.current.find((x) => x.id === id);
        if (!h || h.source.kind !== "github") return;
        if (token) tokens.current[id] = token;
        void runGitHubScan(id, h.source, token ?? tokens.current[id]);
      },
      uploadNewVersion: (id, files) => void runUploadScan(id, files),
      removeHarness: (id) => {
        setHarnesses((list) => list.filter((h) => h.id !== id));
        setAgents((list) => list.map((a) => (a.harnessId === id ? { ...a, harnessId: undefined } : a)));
        delete tokens.current[id];
      },
      linkAgent: (agentId, harnessId) => setAgents((list) => list.map((a) => (a.id === agentId ? { ...a, harnessId } : a))),
    }),
    [agents, policies, incidents, activity, harnesses, trustTrend, live, runGitHubScan, runUploadScan, patch],
  );

  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}

export function useFleet() {
  const v = useContext(Ctx);
  if (!v) throw new Error("useFleet must be used inside FleetProvider");
  return v;
}
