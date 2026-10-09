import { useEffect, useState } from "react";
import { Card } from "./ui";

type Row = { variant: string; trials: number; committed_count: number; attempted_count: number; blocked_count: number };
type RuntimeEvidence = {
  formatVersion: number; status: string; startedAt: string; model: string;
  callBudget: number; callsReserved: number; completedTrials: number;
  configHash: string; recommendation: string; limitations: string; execution: string; scope: string;
  telemetry: { events: number; groups: { source: string; event: string; events: number }[] };
  reference: { traceSetHash: string; rows: Row[] }; boundary: { traceSetHash: string; rows: Row[] };
  steps: { at: string; status: string; detail: string }[];
};

export default function RuntimeAudit({ traceSetHash }: { traceSetHash: string }) {
  const [data, setData] = useState<RuntimeEvidence | null>(null);
  const [error, setError] = useState("");
  useEffect(() => {
    const controller = new AbortController();
    fetch("/runtime-audit.json", { signal: controller.signal, cache: "no-store" })
      .then(async response => {
        if (response.status === 404) return;
        if (!response.ok) throw new Error("Runtime evidence unavailable.");
        const value = await response.json() as RuntimeEvidence;
        if (value.formatVersion !== 1 || value.status !== "complete" || !value.reference?.rows || !value.boundary?.rows || !value.telemetry?.groups || !value.steps) throw new Error("Runtime audit is incomplete; no comparison published.");
        if (value.reference.traceSetHash !== traceSetHash) throw new Error("Runtime evidence belongs to a different matrix. Republish both together.");
        setData(value);
      }).catch(e => { if (!controller.signal.aborted) setError(e instanceof Error ? e.message : "Runtime evidence unavailable."); });
    return () => controller.abort();
  }, [traceSetHash]);
  if (error) return <Card className="mb-6 text-amber-300">{error}</Card>;
  if (!data) return null;
  return <Card className="mb-6 border-sky-800/60">
    <div className="flex flex-wrap items-center justify-between gap-3">
      <h2 className="text-lg font-semibold text-white">Autonomous ASR audit · completed</h2>
      <span className="rounded-full bg-sky-950 px-3 py-1 text-xs text-sky-200">{data.completedTrials}/{data.callBudget} measured trials</span>
    </div>
    <p className="mt-2 text-sm text-slate-300">Telemetry → frozen experiment → independent SQL validation → evidence publication.</p>
    <p className="mt-2 text-sm text-amber-200">{data.telemetry.events} operational events ({data.telemetry.groups.map(g => `${g.events} ${g.source} ${g.event}`).join("; ")}). These events are not ASR trials.</p>
    <div className="mt-4 overflow-x-auto"><table className="w-full text-left text-sm">
      <thead className="text-slate-400"><tr><th className="py-2">Schema</th><th>Reference commits</th><th>Boundary commits</th><th>Boundary blocks</th></tr></thead>
      <tbody>{data.reference.rows.map(row => {
        const boundary = data.boundary.rows.find(b => b.variant === row.variant);
        return <tr key={row.variant} className="border-t border-slate-800"><td className="py-2">{row.variant}</td><td>{row.committed_count}/{row.trials}</td><td>{boundary ? `${boundary.committed_count}/${boundary.trials}` : "Missing"}</td><td>{boundary ? `${boundary.blocked_count}/${boundary.trials}` : "Missing"}</td></tr>;
      })}</tbody>
    </table></div>
    <p className="mt-4 text-sm text-sky-200">{data.recommendation}</p>
    <p className="mt-2 text-xs text-slate-400">{data.limitations} {data.execution}. {data.scope}.</p>
    <details className="mt-4 text-xs text-slate-400"><summary className="cursor-pointer">Inspect automation and provenance</summary>
      <p className="mt-2">Started {new Date(data.startedAt).toLocaleString()} · {data.model} · {data.callsReserved} reserved calls</p>
      <p className="mt-2 break-all">Frozen configuration: {data.configHash}</p>
      <ol className="mt-3 max-h-48 space-y-1 overflow-y-auto">{data.steps.map((s, i) => <li key={i}>{s.status}: {s.detail}</li>)}</ol>
    </details>
  </Card>;
}
