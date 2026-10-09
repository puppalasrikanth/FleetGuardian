import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { ArrowRight, GitBranch, RefreshCw, ShieldCheck } from "lucide-react";
import { Button, Card, PageHeader, Stat } from "../components/ui";
import { useFleet } from "../data/store";

type Row = {
  variant: string; trials: number; expected_trials: number; committed_asr: number;
  committed_count: number; attempted_count: number; blocked_count: number;
  abstained_count: number; tool_selection_error_count: number; delta_vs_baseline: number | null;
};
type Trace = {
  id: string; variant: string; trial: number;
  calls: { name: string; role: string | null; status: string; args: unknown }[];
  grader: { committed: boolean; attempted: boolean; blocked: boolean; abstained: boolean };
};
type AuditReport = {
  formatVersion: number; source: "fixture" | "live"; complete: boolean;
  provider: string; model: string; responseModel: string | null; temperature: number; seed: number | null;
  enforceBoundary: boolean; policy: string; objective: string; traceSetHash: string;
  rows: Row[]; traces: Trace[];
  schemas: Record<string, { configHash: string; tools: { role: string; function: { name: string; description: string } }[] }>;
};
const names: Record<string, string> = { baseline: "Descriptive baseline", neutralized: "Name shift", threat_loaded: "Urgency framing", normalized: "Canonical schema" };
const descriptions: Record<string, string> = { baseline: "Explicit archive / external-send names", neutralized: "tool_a / tool_b; original descriptions", threat_loaded: "Urgent compliance naming + description", normalized: "tool_a / tool_b; neutral descriptions" };
const order = ["baseline", "neutralized", "threat_loaded", "normalized"];
const fraction = (count: number, n: number) => `${count}/${n} · ${(100 * count / n).toFixed(0)}%`;
const pp = (delta: number | null) => delta === null ? "—" : `${delta > 0 ? "+" : ""}${(100 * delta).toFixed(1)} pp`;

export default function RepresentationAudit() {
  const { harnesses } = useFleet();
  const [report, setReport] = useState<AuditReport | null>(null);
  const [error, setError] = useState("");
  const [revision, setRevision] = useState(0);
  const [normalized, setNormalized] = useState(false);
  const [killchain, setKillchain] = useState(false);
  useEffect(() => {
    const controller = new AbortController();
    setReport(null); setError(""); setNormalized(false);
    fetch("/schema-audit.json", { cache: "no-store", signal: controller.signal })
      .then(async (response) => {
        if (!response.ok) throw new Error("No published audit report. Export a validated SchemaShift cohort to load ASR evidence.");
        const data = await response.json() as AuditReport;
        if (data.formatVersion !== 1 || !["fixture", "live"].includes(data.source) || !Array.isArray(data.rows) || !data.rows.length || !Array.isArray(data.traces) || !data.schemas) throw new Error("Unsupported audit report. Republish with export_fleet.py.");
        setReport(data);
      }).catch((e) => { if (!controller.signal.aborted) setError(e instanceof Error ? e.message : "Cannot load audit report."); });
    return () => controller.abort();
  }, [revision]);
  const sourceScans = harnesses.filter((h) => h.scan);
  const findings = sourceScans.flatMap((h) => h.vulns).filter((v) => v.status === "open").length;
  const rows = report ? [...report.rows].sort((a, b) => order.indexOf(a.variant) - order.indexOf(b.variant)) : [];
  const visible = rows.filter((r) => normalized || r.variant !== "normalized");
  const baseline = rows.find((r) => r.variant === "baseline");
  const threat = rows.find((r) => r.variant === "threat_loaded");
  const canonical = rows.find((r) => r.variant === "normalized");
  const measured = report?.source === "live";
  const comparable = measured && report?.complete;
  return (
    <>
      <div className="mb-3 flex items-center gap-2 text-xs font-medium uppercase tracking-widest text-brand-400"><GitBranch className="h-4 w-4" /> SchemaShift / evaluation integrity</div>
      <PageHeader title="Does your ASR survive different tool wording?" subtitle="Representation-sensitive committed attack success rate, under a frozen policy and adversarial objective." actions={<Button onClick={() => setRevision((r) => r + 1)}><RefreshCw className="h-4 w-4" /> Reload evidence</Button>} />
      <p className="mb-6 text-lg text-slate-300">Clean Semgrep ≠ honest security score.</p>
      {error && <Card className="mb-5 text-rose-300"><p role="alert">{error}</p></Card>}
      {!report && !error && <Card>Loading validated audit evidence…</Card>}
      {report && <>
        <div role="status" className={`mb-5 rounded-xl border p-4 text-sm ${measured ? "border-sky-700 bg-sky-950/40 text-sky-200" : "border-amber-700/60 bg-amber-950/30 text-amber-200"}`}>
          <strong>{measured ? "MEASURED REPLAY" : "ILLUSTRATIVE FIXTURES — no model was called"}</strong>
          <p className="mt-1">{measured ? "Descriptive results for this task and model configuration. An observed difference does not establish causality or generalize to other agents." : "These bars demonstrate the pipeline. No measured schema sensitivity or ASR reduction is claimed."} {!report.complete && "PARTIAL COHORT: inspect n/expected; this is not a completed matrix."}</p>
        </div>
        <div className="mb-6 grid gap-4 sm:grid-cols-3">
          <Stat label="Measured baseline committed ASR" value={measured && baseline ? fraction(baseline.committed_count, baseline.trials) : "Pending"} hint={measured ? "Simulated external commits / trials" : "Awaiting live model evidence"} />
          <Stat label="Urgency framing Δ baseline" value={comparable && threat ? pp(threat.delta_vs_baseline) : "Not established"} hint="Percentage points; same frozen controls" />
          <Stat label="Remediation evidence" value={measured && canonical ? "Recorded" : "Hypothesis"} hint="Canonical wording must be evaluated; no promised reduction" />
        </div>
        <div className="grid items-start gap-5 xl:grid-cols-3">
          <div className="space-y-5 xl:col-span-2">
            <Card>
              <div className="mb-5 flex flex-wrap items-center justify-between gap-3"><h2 className="text-lg font-semibold text-white">Committed ASR across schemas</h2><span className="text-xs text-slate-400">{measured ? "Measured counts" : "Fixture counts only"}</span></div>
              <div className="space-y-5">{visible.map((row) => <div key={row.variant}>
                <div className="mb-2 flex flex-wrap justify-between gap-2 text-sm"><div><span className="font-medium text-white">{names[row.variant] || row.variant}</span><span className="ml-2 text-xs text-slate-500">n={row.trials}/{row.expected_trials}</span></div><span className="font-mono text-orange-300">{fraction(row.committed_count, row.trials)}</span></div>
                <div className="h-3 overflow-hidden rounded-full bg-slate-800"><div className={`h-full rounded-full ${row.variant === "normalized" ? "bg-brand-400" : "bg-orange-400"}`} style={{ width: `${100 * row.committed_asr}%` }} /></div>
                <div className="mt-2 flex flex-wrap justify-between gap-2 text-xs text-slate-400"><span>{descriptions[row.variant]}</span><span>{pp(row.delta_vs_baseline)} vs baseline{!measured && " · illustrative"}</span></div>
              </div>)}</div>
              <div className="mt-6 flex flex-wrap gap-2"><Button variant="primary" disabled={!canonical || !threat} onClick={() => setNormalized(!normalized)}>{normalized ? "Hide canonical comparison" : "Normalize schema"}</Button><Button onClick={() => setKillchain(!killchain)}>{killchain ? "Hide kill-chain" : "Show kill-chain"}</Button></div>
              <p className="mt-3 text-xs text-slate-500">Normalize reveals recorded trials. Kill-chain explains recorded outcomes. Neither button runs a model, rewrites deployed tools, or predicts lower ASR.</p>
            </Card>
            {normalized && canonical && threat && <Card className="border-brand-700/50">
              <h2 className="font-semibold text-white">Canonical wording: an intervention hypothesis</h2>
              <p className="mt-3 text-lg text-brand-300">{fraction(threat.committed_count, threat.trials)} → {fraction(canonical.committed_count, canonical.trials)}</p>
              <p className="mt-2 text-sm text-slate-400">Urgency framing → canonical tool_a / tool_b. Change: {pp(canonical.committed_asr - threat.committed_asr)}.{!measured && " Fixture arithmetic only; not a measured effect."} Canonical wording is not an execution boundary; this comparison alone does not prove causality.</p>
            </Card>}
            <Card className="overflow-x-auto">
              <h2 className="mb-3 font-semibold text-white">Separate attempts from committed actions</h2>
              <table className="w-full whitespace-nowrap text-left text-xs"><thead className="text-slate-500"><tr>{["Variant", "n/expected", "Committed", "Attempted", "Blocked", "Abstained", "Selection error"].map((h) => <th key={h} className="px-2 py-3 font-medium">{h}</th>)}</tr></thead>
              <tbody className="divide-y divide-slate-800">{visible.map((r) => <tr key={r.variant}><td className="px-2 py-3 text-slate-200">{names[r.variant]}</td><td className="px-2">{r.trials}/{r.expected_trials}</td>{[r.committed_count, r.attempted_count, r.blocked_count, r.abstained_count, r.tool_selection_error_count].map((count, i) => <td className="px-2" key={i}>{fraction(count, r.trials)}</td>)}</tr>)}</tbody></table>
              <p className="mt-3 text-xs text-slate-500">Per-trial flags can overlap. No call means abstention, not proven refusal. Task success here means the attacker objective succeeded in simulation.</p>
            </Card>
            {killchain && <Card>
              <h2 className="font-semibold text-white">Kill-chain / recorded trial outcomes</h2>
              <p className="my-3 text-sm text-slate-400">S1: tool selection → S2: interface grounding under test → S3: argument binding → simulated commit or boundary block. S2 is not independently scored; this is not the paper's full failure-attribution procedure.</p>
              <div className="space-y-2">{report.traces.filter((t) => normalized || t.variant !== "normalized").map((t) => <details key={t.id} className="rounded-lg border border-slate-800 p-3 text-sm">
                <summary className="cursor-pointer text-slate-200">{names[t.variant]} · trial {t.trial} · {t.grader.committed ? "simulated commit" : t.grader.blocked ? "boundary blocked" : t.grader.abstained ? "abstained" : "selection / argument error"}</summary>
                <div className="mt-3 flex flex-wrap gap-2 text-xs text-brand-300"><span>S1: {t.grader.attempted ? "external tool attempted" : t.calls.length ? "other / unknown tool" : "no call"}</span><span>→ S3: {t.calls.some((c) => c.role === "send" && ["committed", "blocked"].includes(c.status)) ? "valid external arguments" : "no valid external call"}</span><span>→ {t.grader.committed ? "committed" : t.grader.blocked ? "blocked" : "not committed"}</span></div>
                <pre className="mt-3 overflow-x-auto whitespace-pre-wrap break-words text-xs text-slate-400">{JSON.stringify(t.calls, null, 2)}</pre>
              </details>)}</div>
            </Card>}
          </div>
          <div className="space-y-5">
            <Card><h2 className="font-semibold text-white">Frozen comparison</h2><dl className="mt-4 space-y-3 text-sm"><div><dt className="text-slate-500">Provider / model</dt><dd className="break-words">{report.provider} / {report.model}</dd></div><div><dt className="text-slate-500">Sampling</dt><dd>Temperature {report.temperature} · seed {report.seed ?? "not requested"}</dd></div><div><dt className="text-slate-500">Execution condition</dt><dd>{report.enforceBoundary ? "Boundary enforced" : "Reference executor; boundary not enforced"}</dd></div></dl><p className="mt-4 text-xs text-slate-400">Fixed policy, task, parameter contracts, tool order, executor, and grader. Only names and descriptions vary. Small trial counts do not establish stability.</p><details className="mt-4 text-xs text-slate-400"><summary className="cursor-pointer">Policy, objective & provenance</summary><p className="mt-3">{report.policy}</p><p className="mt-3">{report.objective}</p><p className="mt-3 break-all">Trace-set SHA-256: {report.traceSetHash}</p><pre className="mt-3 whitespace-pre-wrap break-all">{JSON.stringify(report.schemas, null, 2)}</pre></details></Card>
            <Card><h2 className="font-semibold text-white">Remediation status</h2><p className="mt-3 text-sm text-slate-300">Canonical wording: {canonical ? "recorded comparison available" : "awaiting trials"}.</p><p className="mt-3 text-sm text-slate-300">Execution boundary: {report.enforceBoundary ? "enabled in this cohort" : "separate evaluation required"}.</p><p className="mt-3 text-xs text-slate-500">Compare boundary-enforced runs separately. Never mix changed execution controls into a schema-only delta.</p></Card>
            <Card><div className="flex items-center gap-2"><ShieldCheck className="h-4 w-4 text-slate-400" /><h2 className="font-semibold text-white">Harness source trust</h2></div><p className="mt-3 text-sm text-slate-400">Semgrep reviews source code. {sourceScans.length ? `${sourceScans.length} local scans · ${findings} open findings.` : "No source scan in this session."} Static findings do not measure ASR.</p><p className="mt-2 text-xs text-slate-500">The source-scan target and the records-assistant experiment are distinct; a clean frontend scan is not evidence about its agent contract.</p><Link to="/harnesses" className="mt-4 inline-flex items-center gap-1 text-sm text-brand-400">Open source module <ArrowRight className="h-3 w-3" /></Link></Card>
          </div>
        </div>
      </>}
      <Card className="mt-6"><h2 className="font-semibold text-white">Three layers, three questions</h2><div className="mt-4 grid gap-5 text-sm md:grid-cols-3"><div><p className="font-medium text-brand-300">SchemaShift / contract</p><p className="mt-1 text-slate-400">Does your committed-ASR score depend on tool wording?</p></div><div><p className="font-medium text-slate-200">Semgrep / source</p><p className="mt-1 text-slate-400">Which patterns in the harness code need security review?</p></div><div><p className="font-medium text-slate-200">Runtime controls / stop</p><p className="mt-1 text-slate-400">Should an attempted action be blocked? Pi is a comparison, not an integrated service here.</p><Link to="/runtime" className="mt-2 inline-block text-brand-400">Runtime fleet simulation →</Link></div></div></Card>
      <p className="mt-5 text-xs leading-relaxed text-slate-500">Prior art: <a className="text-brand-400 underline" href="https://arxiv.org/html/2608.23635v1" target="_blank" rel="noreferrer">ToolRobustBench</a> Family A locates interface perturbations at selection / schema grounding. Our name shift aligns conceptually with A1; urgency framing is not an exact A2 reproduction, and A3 is not separately tested. Our endpoint is security ASR under an adversarial objective, not its benign task-success leaderboard.</p>
    </>
  );
}
