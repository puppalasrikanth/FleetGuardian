import { GitBranch, Plus, X } from "lucide-react";
import { useEffect, useState, type FormEvent } from "react";
import { Link } from "react-router-dom";
import { useFleet } from "../data/store";
import type { Risk } from "../data/types";
import { Button, Card, PageHeader, Stat, timeAgo } from "../components/ui";

import { sourceRepositories, type SourceRepository } from "../data/sourceApi";

const sevOrder: Risk[] = ["critical", "high", "medium", "low"];
const sevDot: Record<Risk, string> = { critical: "bg-rose-500", high: "bg-orange-400", medium: "bg-amber-300", low: "bg-emerald-400" };

function ScoreRing({ score }: { score: number }) {
  const color = score >= 80 ? "#34d399" : score >= 60 ? "#fbbf24" : "#fb7185";
  const c = 2 * Math.PI * 18;
  return (
    <svg width="48" height="48" viewBox="0 0 48 48" className="shrink-0">
      <circle cx="24" cy="24" r="18" fill="none" stroke="#1e293b" strokeWidth="5" />
      <circle cx="24" cy="24" r="18" fill="none" stroke={color} strokeWidth="5" strokeDasharray={c} strokeDashoffset={c * (1 - score / 100)} strokeLinecap="round" transform="rotate(-90 24 24)" />
      <text x="24" y="28" textAnchor="middle" fontSize="12" fontWeight="600" fill="#e2e8f0">{score}</text>
    </svg>
  );
}

function RegisterForm({ onClose }: { onClose: () => void }) {
  const { registerHarness } = useFleet();
  const [f, setF] = useState({ name: "", repo: "", language: "Python", framework: "LangGraph", branch: "main" });
  const [repositories, setRepositories] = useState<SourceRepository[]>([]);
  const [loading, setLoading] = useState(true);
  const [scanning, setScanning] = useState(false);
  const [error, setError] = useState("");
  useEffect(() => {
    let active = true;
    sourceRepositories().then(({ repositories }) => {
      if (!active) return;
      setRepositories(repositories);
      if (repositories[0]) setF((f) => ({ ...f, repo: repositories[0].repo, branch: repositories[0].branch }));
    }).catch((e) => { if (active) setError(e instanceof Error ? e.message : "Cannot load repositories."); })
      .finally(() => { if (active) setLoading(false); });
    return () => { active = false; };
  }, []);
  const set = (k: keyof typeof f) => (e: { target: { value: string } }) => setF({ ...f, [k]: e.target.value });
  const submit = async (e: FormEvent) => {
    e.preventDefault();
    if (!f.name || !f.repo) return;
    setScanning(true);
    setError("");
    try { await registerHarness(f); onClose(); }
    catch (e) { setError(e instanceof Error ? e.message : "Scan failed."); }
    finally { setScanning(false); }
  };
  const input = "mt-1 w-full rounded-lg border border-slate-800 bg-slate-950 px-3 py-2 text-sm text-slate-200 focus:border-brand-500 focus:outline-none";
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4" onClick={() => { if (!scanning) onClose(); }}>
      <form onSubmit={submit} onClick={(e) => e.stopPropagation()} className="w-full max-w-lg rounded-xl border border-slate-800 bg-slate-900 p-6 shadow-2xl">
        <div className="mb-4 flex items-center justify-between">
          <h2 className="text-lg font-semibold text-white">Register agent source code</h2>
          <button type="button" onClick={() => { if (!scanning) onClose(); }} className="text-slate-400 hover:text-white"><X className="h-5 w-5" /></button>
        </div>
        <p className="mb-4 text-sm text-slate-400">Select a local checkout configured in the scanner. Scan its current working files with Semgrep; no source code is executed or uploaded. Results last for this browser session.</p>
        <fieldset disabled={scanning || loading} className="space-y-3">
          <label className="block text-sm"><span className="text-slate-400">Name</span><input className={input} value={f.name} onChange={set("name")} placeholder="e.g. sales-assistant" autoFocus /></label>
          <label className="block text-sm"><span className="text-slate-400">Repository URL</span><select className={input} value={f.repo} onChange={(e) => {
            const repo = repositories.find((r) => r.repo === e.target.value);
            if (repo) setF({ ...f, repo: repo.repo, branch: repo.branch });
          }}><option value="" disabled>{loading ? "Loading checkouts…" : "Select a configured checkout"}</option>{repositories.map((r) => <option key={r.repo} value={r.repo}>{r.repo}</option>)}</select></label>
          <div className="grid grid-cols-3 gap-3">
            <label className="block text-sm"><span className="text-slate-400">Language</span>
              <select className={input} value={f.language} onChange={set("language")}>{["Python", "TypeScript", "JavaScript", "Mixed"].map((x) => <option key={x}>{x}</option>)}</select>
            </label>
            <label className="block text-sm"><span className="text-slate-400">Framework</span>
              <select className={input} value={f.framework} onChange={set("framework")}>{["LangGraph", "CrewAI", "Claude Agent SDK", "AutoGen", "Spring AI", "Custom"].map((x) => <option key={x}>{x}</option>)}</select>
            </label>
            <label className="block text-sm"><span className="text-slate-400">Branch</span><input className={input} value={f.branch} readOnly /></label>
          </div>
        </fieldset>
        {error && <p role="alert" className="mt-3 text-sm text-rose-300">{error}</p>}
        <div className="mt-6 flex justify-end gap-2">
          <Button variant="ghost" onClick={() => { if (!scanning) onClose(); }}>Cancel</Button>
          <Button type="submit" variant="primary" disabled={!f.name.trim() || !f.repo || scanning || loading}>{scanning ? "Scanning…" : "Register & scan"}</Button>
        </div>
      </form>
    </div>
  );
}

export default function Harnesses() {
  const { harnesses, agents } = useFleet();
  const [open, setOpen] = useState(false);
  const measured = harnesses.filter((h) => h.scan);
  const allOpen = measured.flatMap((h) => h.vulns).filter((v) => v.status === "open");
  const avg = Math.round(measured.reduce((s, h) => s + h.securityScore, 0) / Math.max(1, measured.length));

  return (
    <>
      <PageHeader
        title="Harness source trust"
        subtitle="Semgrep is the source-review module. Static findings do not measure representation-sensitive ASR."
        actions={<Button variant="primary" onClick={() => setOpen(true)}><Plus className="h-4 w-4" /> Register repository</Button>}
      />

      <p className="mb-4 text-sm text-slate-400">Cards labeled Demo fixture contain sample findings. Real scans cover configured local working files and seven static review rules; a clean scan does not prove the code is secure. Results and triage reset on reload.</p>
      <div className="mb-6 grid grid-cols-2 gap-4 lg:grid-cols-4">
        <Stat label="Scanned repositories" value={measured.length} />
        <Stat label="Avg scan heuristic" value={measured.length ? avg : "—"} tone={avg >= 80 ? "good" : avg >= 60 ? "warn" : "bad"} />
        <Stat label="Measured open findings" value={allOpen.length} tone={allOpen.length ? "warn" : "good"} />
        <Stat label="Measured critical" value={allOpen.filter((v) => v.severity === "critical").length} tone="bad" />
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        {harnesses.map((h) => {
          const open = h.vulns.filter((v) => v.status === "open");
          const used = agents.filter((a) => a.harnessId === h.id);
          return (
            <Link key={h.id} to={`/harnesses/${h.id}`}>
              <Card className="h-full transition hover:border-slate-600">
                <div className="flex items-start gap-4">
                  <ScoreRing score={h.securityScore} />
                  <div className="min-w-0 flex-1">
                    <div className="font-mono font-medium text-white">{h.name}</div>
                    <div className="mt-1 text-xs text-sky-300">{h.scan ? `Semgrep · ${h.scan.filesScanned} files` : "Demo fixture"}</div>
                    <div className="truncate text-xs text-slate-500">{h.repo}</div>
                    <div className="mt-1 flex items-center gap-3 text-xs text-slate-400">
                      <span>{h.framework}</span><span>{h.language}</span>
                      <span className="flex items-center gap-1"><GitBranch className="h-3 w-3" />{h.branch}</span>
                    </div>
                  </div>
                </div>
                <div className="mt-4 flex flex-wrap items-center gap-3 text-xs">
                  {sevOrder.map((s) => {
                    const n = open.filter((v) => v.severity === s).length;
                    return n ? <span key={s} className="flex items-center gap-1.5 text-slate-300"><span className={`h-2 w-2 rounded-full ${sevDot[s]}`} />{n} {s}</span> : null;
                  })}
                  {!open.length && <span className="text-emerald-300">No open findings in this scan</span>}
                </div>
                <div className="mt-3 flex justify-between text-xs text-slate-500">
                  <span>Powers {used.length ? used.map((a) => a.name).join(", ") : "no agents yet"}</span>
                  <span>Scanned {timeAgo(h.lastScan)}</span>
                </div>
              </Card>
            </Link>
          );
        })}
      </div>
      {open && <RegisterForm onClose={() => setOpen(false)} />}
    </>
  );
}
