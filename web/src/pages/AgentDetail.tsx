import { ArrowLeft, Lock, Pause, Play, ShieldOff } from "lucide-react";
import { Link, useParams } from "react-router-dom";
import { useFleet } from "../data/store";
import { Badge, Button, Card, Empty, IncidentBadge, PageHeader, RiskBadge, StatusBadge, TrustMeter, timeAgo } from "../components/ui";

const kindStyle: Record<string, string> = {
  tool_call: "bg-sky-400",
  message: "bg-slate-400",
  decision: "bg-violet-400",
  violation: "bg-rose-400",
  intervention: "bg-amber-400",
};

export default function AgentDetail() {
  const { id } = useParams();
  const { agents, activity, incidents, policies, harnesses, setAgentStatus } = useFleet();
  const a = agents.find((x) => x.id === id);
  if (!a) return <Empty>Agent not found. <Link to="/agents" className="text-brand-400">Back to agents</Link></Empty>;

  const h = harnesses.find((x) => x.id === a.harnessId);
  const events = activity.filter((e) => e.agentId === a.id).slice(0, 40);
  const agentIncidents = incidents.filter((i) => i.agentId === a.id);
  const applied = policies.filter((p) => p.enabled && (p.scope === "all" || p.scope.includes(a.id)));
  const openVulns = h?.vulns.filter((v) => v.status === "open") ?? [];

  return (
    <>
      <Link to="/agents" className="mb-4 inline-flex items-center gap-1 text-sm text-slate-400 hover:text-white"><ArrowLeft className="h-4 w-4" /> Agents</Link>
      <PageHeader
        title={a.name}
        subtitle={`${a.role} · owned by ${a.owner} (${a.team}) · ${a.model} · ${a.region}`}
        actions={
          <>
            {a.status !== "active" && <Button variant="primary" onClick={() => setAgentStatus(a.id, "active")}><Play className="h-4 w-4" /> Resume</Button>}
            {a.status === "active" && <Button onClick={() => setAgentStatus(a.id, "paused")}><Pause className="h-4 w-4" /> Pause</Button>}
            {a.status !== "quarantined" && <Button variant="danger" onClick={() => setAgentStatus(a.id, "quarantined")}><Lock className="h-4 w-4" /> Quarantine</Button>}
          </>
        }
      />

      <div className="grid gap-4 md:grid-cols-4">
        <Card><div className="text-sm text-slate-400">Status</div><div className="mt-2"><StatusBadge status={a.status} /></div></Card>
        <Card><div className="text-sm text-slate-400">Trust score</div><div className="mt-2"><TrustMeter score={a.trustScore} /></div></Card>
        <Card><div className="text-sm text-slate-400">Risk</div><div className="mt-2"><RiskBadge risk={a.risk} /></div></Card>
        <Card>
          <div className="text-sm text-slate-400">Spend today</div>
          <div className="mt-1 text-xl font-semibold tabular-nums text-white">${a.spendToday.toFixed(2)} <span className="text-sm text-slate-500">/ ${a.spendLimit}</span></div>
          <div className="mt-2 h-1.5 overflow-hidden rounded-full bg-slate-800">
            <div className={`h-full ${a.spendToday > a.spendLimit ? "bg-rose-400" : "bg-brand-500"}`} style={{ width: `${Math.min(100, (a.spendToday / a.spendLimit) * 100)}%` }} />
          </div>
        </Card>
      </div>

      <div className="mt-6 grid gap-4 lg:grid-cols-3">
        <Card className="lg:col-span-2">
          <h2 className="mb-4 font-medium text-white">Activity timeline</h2>
          {events.length ? (
            <ol className="relative space-y-3 border-l border-slate-800 pl-5">
              {events.map((e) => (
                <li key={e.id} className="relative">
                  <span className={`absolute -left-[25px] top-1.5 h-2.5 w-2.5 rounded-full ring-4 ring-slate-950 ${kindStyle[e.kind]}`} />
                  <div className="flex flex-wrap items-baseline gap-2 text-sm">
                    <span className="text-slate-200">{e.summary}</span>
                    <span className="text-xs text-slate-500">{e.kind.replace("_", " ")} · {timeAgo(e.time)}</span>
                  </div>
                </li>
              ))}
            </ol>
          ) : (
            <Empty>No recent activity.</Empty>
          )}
        </Card>

        <div className="space-y-4">
          <Card>
            <h2 className="mb-3 font-medium text-white">Permissions</h2>
            <div className="text-xs uppercase text-slate-500">Tools</div>
            <div className="mt-1 flex flex-wrap gap-1.5">
              {a.tools.map((t) => <Badge key={t} className="bg-slate-800 font-mono text-slate-300 ring-slate-700">{t}</Badge>)}
            </div>
            <div className="mt-3 text-xs uppercase text-slate-500">Data scopes</div>
            <div className="mt-1 flex flex-wrap gap-1.5">
              {a.dataScopes.map((t) => <Badge key={t} className="bg-slate-800 text-slate-300 ring-slate-700">{t}</Badge>)}
            </div>
          </Card>

          <Card>
            <h2 className="mb-3 font-medium text-white">Guardrails applied ({applied.length})</h2>
            <ul className="space-y-2 text-sm">
              {applied.map((p) => <li key={p.id} className="flex justify-between gap-2"><span className="text-slate-300">{p.name}</span><span className="text-xs text-slate-500">{p.enforcement}</span></li>)}
            </ul>
          </Card>

          {h && (
            <Card>
              <h2 className="mb-1 font-medium text-white">Source code</h2>
              <Link to={`/harnesses/${h.id}`} className="font-mono text-sm text-brand-400 hover:underline">{h.name}</Link>
              <div className="text-xs text-slate-500">{h.framework} · {h.language}</div>
              <div className={`mt-2 flex items-center gap-2 text-sm ${openVulns.length ? "text-orange-300" : "text-emerald-300"}`}>
                <ShieldOff className="h-4 w-4" /> {openVulns.length} open vulnerabilities
              </div>
            </Card>
          )}
        </div>
      </div>

      <Card className="mt-6">
        <h2 className="mb-3 font-medium text-white">Incidents</h2>
        {agentIncidents.length ? (
          <ul className="divide-y divide-slate-800">
            {agentIncidents.map((i) => (
              <li key={i.id} className="flex flex-wrap items-center gap-3 py-2.5 text-sm">
                <RiskBadge risk={i.severity} />
                <span className="flex-1">{i.title}</span>
                <span className="text-xs text-slate-500">{timeAgo(i.time)}</span>
                <IncidentBadge status={i.status} />
              </li>
            ))}
          </ul>
        ) : (
          <Empty>No incidents for this agent.</Empty>
        )}
      </Card>
    </>
  );
}
