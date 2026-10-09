import { Check, Eye, Lock, Pause, ThumbsUp } from "lucide-react";
import { useState } from "react";
import { Link } from "react-router-dom";
import { useFleet } from "../data/store";
import type { IncidentStatus } from "../data/types";
import { Button, Card, Empty, IncidentBadge, PageHeader, RiskBadge, StatusBadge, timeAgo } from "../components/ui";

const tabs: (IncidentStatus | "all")[] = ["open", "acknowledged", "resolved", "all"];

export default function Incidents() {
  const { incidents, agents, policies, setIncidentStatus, setAgentStatus } = useFleet();
  const [tab, setTab] = useState<IncidentStatus | "all">("open");
  const [selected, setSelected] = useState<string | null>(null);

  const rows = incidents.filter((i) => tab === "all" || i.status === tab);
  const sel = incidents.find((i) => i.id === selected) ?? rows[0];
  const selAgent = sel && agents.find((a) => a.id === sel.agentId);
  const selPolicy = sel && policies.find((p) => p.id === sel.policyId);

  const intervene = (action: "warn" | "pause" | "quarantine" | "approve") => {
    if (!sel || !selAgent) return;
    if (action === "pause") setAgentStatus(selAgent.id, "paused");
    if (action === "quarantine") setAgentStatus(selAgent.id, "quarantined");
    const label = { warn: "Agent warned", pause: "Agent paused", quarantine: "Agent quarantined", approve: "Approved by human" }[action];
    setIncidentStatus(sel.id, action === "warn" ? "acknowledged" : "resolved", label);
  };

  return (
    <>
      <PageHeader title="Incidents & interventions" subtitle="Policy violations caught across the fleet. Decide what happens next." />
      <div className="mb-4 flex gap-1">
        {tabs.map((t) => {
          const n = t === "all" ? incidents.length : incidents.filter((i) => i.status === t).length;
          return (
            <button key={t} onClick={() => setTab(t)} className={`rounded-lg px-3 py-1.5 text-sm capitalize ${tab === t ? "bg-slate-800 text-white" : "text-slate-400 hover:bg-slate-900"}`}>
              {t} <span className="ml-1 text-xs text-slate-500">{n}</span>
            </button>
          );
        })}
      </div>

      <div className="grid gap-4 lg:grid-cols-5">
        <Card className="p-0 lg:col-span-2">
          {rows.length ? (
            <ul className="max-h-[70vh] divide-y divide-slate-800 overflow-y-auto">
              {rows.map((i) => (
                <li key={i.id}>
                  <button onClick={() => setSelected(i.id)} className={`w-full px-4 py-3 text-left transition hover:bg-slate-900 ${sel?.id === i.id ? "bg-slate-800/60" : ""}`}>
                    <div className="flex items-center gap-2">
                      <RiskBadge risk={i.severity} />
                      <span className="text-xs text-slate-500">{agents.find((a) => a.id === i.agentId)?.name} · {timeAgo(i.time)}</span>
                    </div>
                    <div className="mt-1 text-sm text-slate-200">{i.title}</div>
                  </button>
                </li>
              ))}
            </ul>
          ) : (
            <div className="p-4"><Empty>Nothing here. The fleet is behaving.</Empty></div>
          )}
        </Card>

        <Card className="lg:col-span-3">
          {sel && selAgent ? (
            <>
              <div className="flex flex-wrap items-center gap-2">
                <RiskBadge risk={sel.severity} />
                <IncidentBadge status={sel.status} />
                <span className="text-xs text-slate-500">{new Date(sel.time).toLocaleString()}</span>
              </div>
              <h2 className="mt-3 text-lg font-semibold text-white">{sel.title}</h2>
              <p className="mt-2 text-sm leading-relaxed text-slate-300">{sel.detail}</p>

              <dl className="mt-5 grid grid-cols-2 gap-4 text-sm">
                <div>
                  <dt className="text-xs uppercase text-slate-500">Agent</dt>
                  <dd className="mt-1 flex items-center gap-2"><Link to={`/agents/${selAgent.id}`} className="text-brand-400 hover:underline">{selAgent.name}</Link><StatusBadge status={selAgent.status} /></dd>
                </div>
                <div>
                  <dt className="text-xs uppercase text-slate-500">Policy</dt>
                  <dd className="mt-1 text-slate-300">{selPolicy?.name ?? "—"}</dd>
                </div>
                <div>
                  <dt className="text-xs uppercase text-slate-500">Owner</dt>
                  <dd className="mt-1 text-slate-300">{selAgent.owner}</dd>
                </div>
                <div>
                  <dt className="text-xs uppercase text-slate-500">Action taken</dt>
                  <dd className="mt-1 text-slate-300">{sel.actionTaken ?? "None yet"}</dd>
                </div>
              </dl>

              {sel.status !== "resolved" && (
                <div className="mt-6 border-t border-slate-800 pt-5">
                  <div className="mb-3 text-xs uppercase text-slate-500">Intervene</div>
                  <div className="flex flex-wrap gap-2">
                    <Button onClick={() => intervene("warn")}><Eye className="h-4 w-4" /> Warn & acknowledge</Button>
                    <Button onClick={() => intervene("pause")}><Pause className="h-4 w-4" /> Pause agent</Button>
                    <Button variant="danger" onClick={() => intervene("quarantine")}><Lock className="h-4 w-4" /> Quarantine</Button>
                    <Button variant="primary" onClick={() => intervene("approve")}><ThumbsUp className="h-4 w-4" /> Approve action</Button>
                    <Button variant="ghost" onClick={() => setIncidentStatus(sel.id, "resolved")}><Check className="h-4 w-4" /> Resolve</Button>
                  </div>
                </div>
              )}
            </>
          ) : (
            <Empty>Select an incident to see details.</Empty>
          )}
        </Card>
      </div>
    </>
  );
}
