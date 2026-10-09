import { createContext, useContext, useEffect, useMemo, useRef, useState, type ReactNode } from "react";
import type { ActivityEvent, Agent, AgentStatus, Harness, Incident, IncidentStatus, Policy, VulnStatus } from "./types";
import {
  agents as seedAgents,
  harnesses as seedHarnesses,
  incidents as seedIncidents,
  liveIncidentTemplates,
  makeEvent,
  policies as seedPolicies,
  seedActivity,
  seedTrustTrend,
} from "./mock";

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
  registerHarness: (h: Omit<Harness, "id" | "vulns" | "securityScore" | "lastScan">) => void;
  rescanHarness: (id: string) => void;
}

const Ctx = createContext<FleetState | null>(null);

export function FleetProvider({ children }: { children: ReactNode }) {
  const [agents, setAgents] = useState(seedAgents);
  const [policies, setPolicies] = useState(seedPolicies);
  const [incidents, setIncidents] = useState(seedIncidents);
  const [activity, setActivity] = useState(seedActivity);
  const [harnesses, setHarnesses] = useState(seedHarnesses);
  const [trustTrend] = useState(seedTrustTrend);
  const [live, setLive] = useState(true);
  const agentsRef = useRef(agents);
  agentsRef.current = agents;

  const logIntervention = (agentId: string, summary: string) =>
    setActivity((a) => [{ id: `e-int-${Date.now()}`, time: Date.now(), agentId, kind: "intervention" as const, summary }, ...a].slice(0, 400));

  // Live simulation: new activity every few seconds, occasional incident.
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

  const value = useMemo<FleetState>(
    () => ({
      agents, policies, incidents, activity, harnesses, trustTrend, live, setLive,
      setAgentStatus: (id, status) => {
        setAgents((list) => list.map((a) => (a.id === id ? { ...a, status } : a)));
        const verb = { active: "Resumed", paused: "Paused", quarantined: "Quarantined", idle: "Set idle" }[status];
        logIntervention(id, `${verb} by operator`);
      },
      setIncidentStatus: (id, status, action) => {
        setIncidents((list) => list.map((i) => (i.id === id ? { ...i, status, actionTaken: action ?? i.actionTaken } : i)));
      },
      togglePolicy: (id) => setPolicies((list) => list.map((p) => (p.id === id ? { ...p, enabled: !p.enabled, updatedAt: Date.now() } : p))),
      upsertPolicy: (p) =>
        setPolicies((list) => (list.some((x) => x.id === p.id) ? list.map((x) => (x.id === p.id ? p : x)) : [p, ...list])),
      setVulnStatus: (hid, vid, status) =>
        setHarnesses((list) =>
          list.map((h) => (h.id === hid ? { ...h, vulns: h.vulns.map((v) => (v.id === vid ? { ...v, status } : v)) } : h)),
        ),
      registerHarness: (h) =>
        setHarnesses((list) => [
          { ...h, id: `h-${Date.now()}`, vulns: [], securityScore: 100, lastScan: Date.now() },
          ...list,
        ]),
      rescanHarness: (id) => setHarnesses((list) => list.map((h) => (h.id === id ? { ...h, lastScan: Date.now() } : h))),
    }),
    [agents, policies, incidents, activity, harnesses, trustTrend, live],
  );

  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}

export function useFleet() {
  const v = useContext(Ctx);
  if (!v) throw new Error("useFleet must be used inside FleetProvider");
  return v;
}
