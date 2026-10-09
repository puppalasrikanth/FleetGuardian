import { Search } from "lucide-react";
import { useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { useFleet } from "../data/store";
import type { AgentStatus, Risk } from "../data/types";
import { Card, PageHeader, RiskBadge, StatusBadge, TrustMeter, timeAgo } from "../components/ui";

export default function Agents() {
  const { agents, harnesses } = useFleet();
  const [q, setQ] = useState("");
  const [status, setStatus] = useState<AgentStatus | "all">("all");
  const [risk, setRisk] = useState<Risk | "all">("all");

  const rows = useMemo(
    () =>
      agents.filter(
        (a) =>
          (status === "all" || a.status === status) &&
          (risk === "all" || a.risk === risk) &&
          `${a.name} ${a.role} ${a.owner} ${a.team}`.toLowerCase().includes(q.toLowerCase()),
      ),
    [agents, q, status, risk],
  );

  const select = "rounded-lg border border-slate-800 bg-slate-900 px-3 py-2 text-sm text-slate-200";

  return (
    <>
      <PageHeader title="Agent registry" subtitle={`${agents.length} agents under guardianship`} />
      <div className="mb-4 flex flex-wrap gap-2">
        <div className="relative min-w-[220px] flex-1">
          <Search className="absolute left-3 top-2.5 h-4 w-4 text-slate-500" />
          <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search agents, owners, teams…" className={`${select} w-full pl-9`} />
        </div>
        <select value={status} onChange={(e) => setStatus(e.target.value as AgentStatus | "all")} className={select}>
          <option value="all">All statuses</option>
          <option value="active">Active</option>
          <option value="idle">Idle</option>
          <option value="paused">Paused</option>
          <option value="quarantined">Quarantined</option>
        </select>
        <select value={risk} onChange={(e) => setRisk(e.target.value as Risk | "all")} className={select}>
          <option value="all">All risk levels</option>
          <option value="low">Low</option>
          <option value="medium">Medium</option>
          <option value="high">High</option>
          <option value="critical">Critical</option>
        </select>
      </div>

      <Card className="overflow-x-auto p-0">
        <table className="w-full min-w-[900px] text-sm">
          <thead className="border-b border-slate-800 text-left text-xs uppercase text-slate-500">
            <tr>
              <th className="px-5 py-3">Agent</th><th>Owner</th><th>Source code</th><th>Status</th><th>Risk</th><th>Trust</th>
              <th className="text-right">Tasks</th><th className="text-right">Spend</th><th className="px-5 text-right">Last seen</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-800">
            {rows.map((a) => {
              const h = harnesses.find((x) => x.id === a.harnessId);
              const over = a.spendToday > a.spendLimit;
              return (
                <tr key={a.id} className="hover:bg-slate-900/80">
                  <td className="px-5 py-3">
                    <Link to={`/agents/${a.id}`} className="font-medium text-white hover:text-brand-400">{a.name}</Link>
                    <div className="text-xs text-slate-500">{a.role} · {a.model}</div>
                  </td>
                  <td className="text-slate-300">{a.owner}<div className="text-xs text-slate-500">{a.team}</div></td>
                  <td>{h && <Link to={`/harnesses/${h.id}`} className="font-mono text-xs text-slate-300 hover:text-brand-400">{h.name}</Link>}</td>
                  <td><StatusBadge status={a.status} /></td>
                  <td><RiskBadge risk={a.risk} /></td>
                  <td><TrustMeter score={a.trustScore} /></td>
                  <td className="text-right tabular-nums">{a.tasksToday}</td>
                  <td className={`text-right tabular-nums ${over ? "text-rose-400" : ""}`}>${a.spendToday.toFixed(2)}<span className="text-slate-500"> / {a.spendLimit}</span></td>
                  <td className="px-5 text-right text-xs text-slate-400">{timeAgo(a.lastSeen)}</td>
                </tr>
              );
            })}
          </tbody>
        </table>
        {!rows.length && <div className="p-8 text-center text-sm text-slate-500">No agents match these filters.</div>}
      </Card>
    </>
  );
}
