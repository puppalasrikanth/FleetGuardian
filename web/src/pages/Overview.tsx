import { Activity, AlertTriangle, Bot, Bug, DollarSign, ShieldCheck } from "lucide-react";
import { Link } from "react-router-dom";
import { Area, AreaChart, Bar, BarChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { useFleet } from "../data/store";
import { Card, IncidentBadge, PageHeader, RiskBadge, Stat, StatusBadge, TrustMeter, timeAgo } from "../components/ui";

const tooltipStyle = { background: "#0f172a", border: "1px solid #1e293b", borderRadius: 8, fontSize: 12 };

export default function Overview() {
  const { agents, incidents, activity, trustTrend, harnesses } = useFleet();
  const active = agents.filter((a) => a.status === "active").length;
  const contained = agents.filter((a) => a.status === "paused" || a.status === "quarantined").length;
  const fleetTrust = Math.round(agents.reduce((s, a) => s + a.trustScore, 0) / agents.length);
  const openInc = incidents.filter((i) => i.status === "open");
  const spend = agents.reduce((s, a) => s + a.spendToday, 0);
  const openVulns = harnesses.flatMap((h) => h.vulns).filter((v) => v.status === "open");
  const critVulns = openVulns.filter((v) => v.severity === "critical").length;

  const byTeam = Object.values(
    agents.reduce<Record<string, { team: string; violations: number; agents: number }>>((acc, a) => {
      acc[a.team] ??= { team: a.team, violations: 0, agents: 0 };
      acc[a.team].violations += a.violations24h;
      acc[a.team].agents += 1;
      return acc;
    }, {}),
  );

  const atRisk = [...agents].sort((a, b) => a.trustScore - b.trustScore).slice(0, 5);

  return (
    <>
      <PageHeader title="Fleet overview" subtitle="Every agent, every action, held to your rules — in real time." />

      <div className="grid grid-cols-2 gap-4 lg:grid-cols-5">
        <Stat label="Fleet trust score" value={fleetTrust} hint="avg across all agents" tone={fleetTrust >= 80 ? "good" : fleetTrust >= 65 ? "warn" : "bad"} icon={<ShieldCheck className="h-4 w-4" />} />
        <Stat label="Active agents" value={`${active}/${agents.length}`} hint={`${contained} paused or quarantined`} icon={<Bot className="h-4 w-4" />} />
        <Stat label="Open incidents" value={openInc.length} hint={`${openInc.filter((i) => i.severity === "critical" || i.severity === "high").length} high or critical`} tone={openInc.length ? "bad" : "good"} icon={<AlertTriangle className="h-4 w-4" />} />
        <Stat label="Code vulnerabilities" value={openVulns.length} hint={`${critVulns} critical across ${harnesses.length} repos`} tone={critVulns ? "bad" : "warn"} icon={<Bug className="h-4 w-4" />} />
        <Stat label="Spend today" value={`$${spend.toFixed(0)}`} hint="model + tool costs" icon={<DollarSign className="h-4 w-4" />} />
      </div>

      <div className="mt-6 grid gap-4 lg:grid-cols-3">
        <Card className="lg:col-span-2">
          <div className="mb-4 flex items-center justify-between">
            <h2 className="font-medium text-white">Trust & violations — last 24h</h2>
          </div>
          <div className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={trustTrend}>
                <defs>
                  <linearGradient id="trust" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="#2f7fff" stopOpacity={0.4} />
                    <stop offset="100%" stopColor="#2f7fff" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid stroke="#1e293b" vertical={false} />
                <XAxis dataKey="time" stroke="#64748b" fontSize={11} tickLine={false} interval={3} />
                <YAxis yAxisId="l" domain={[50, 100]} stroke="#64748b" fontSize={11} tickLine={false} width={30} />
                <YAxis yAxisId="r" orientation="right" stroke="#64748b" fontSize={11} tickLine={false} width={24} />
                <Tooltip contentStyle={tooltipStyle} />
                <Area yAxisId="l" type="monotone" dataKey="trust" name="Trust score" stroke="#5aa2ff" fill="url(#trust)" strokeWidth={2} />
                <Area yAxisId="r" type="monotone" dataKey="violations" name="Violations" stroke="#fb7185" fill="transparent" strokeWidth={2} />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </Card>

        <Card>
          <h2 className="mb-4 font-medium text-white">Violations by team (24h)</h2>
          <div className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={byTeam} layout="vertical" margin={{ left: 10 }}>
                <CartesianGrid stroke="#1e293b" horizontal={false} />
                <XAxis type="number" stroke="#64748b" fontSize={11} allowDecimals={false} />
                <YAxis type="category" dataKey="team" stroke="#94a3b8" fontSize={12} width={70} />
                <Tooltip contentStyle={tooltipStyle} cursor={{ fill: "#1e293b55" }} />
                <Bar dataKey="violations" name="Violations" fill="#fb923c" radius={[0, 4, 4, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </Card>
      </div>

      <div className="mt-6 grid gap-4 lg:grid-cols-3">
        <Card className="lg:col-span-2">
          <div className="mb-3 flex items-center justify-between">
            <h2 className="font-medium text-white">Agents needing attention</h2>
            <Link to="/agents" className="text-sm text-brand-400 hover:underline">All agents →</Link>
          </div>
          <table className="w-full text-sm">
            <thead className="text-left text-xs uppercase text-slate-500">
              <tr><th className="py-2">Agent</th><th>Status</th><th>Risk</th><th>Trust</th><th className="text-right">Violations</th></tr>
            </thead>
            <tbody className="divide-y divide-slate-800">
              {atRisk.map((a) => (
                <tr key={a.id} className="hover:bg-slate-900">
                  <td className="py-2.5">
                    <Link to={`/agents/${a.id}`} className="font-medium text-white hover:text-brand-400">{a.name}</Link>
                    <div className="text-xs text-slate-500">{a.role}</div>
                  </td>
                  <td><StatusBadge status={a.status} /></td>
                  <td><RiskBadge risk={a.risk} /></td>
                  <td><TrustMeter score={a.trustScore} /></td>
                  <td className="text-right tabular-nums">{a.violations24h}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </Card>

        <Card>
          <div className="mb-3 flex items-center justify-between">
            <h2 className="flex items-center gap-2 font-medium text-white"><Activity className="h-4 w-4 text-emerald-400" /> Live activity</h2>
          </div>
          <ul className="max-h-80 space-y-2 overflow-y-auto pr-1">
            {activity.slice(0, 25).map((e) => {
              const ag = agents.find((a) => a.id === e.agentId);
              const color = e.kind === "violation" ? "text-rose-300" : e.kind === "intervention" ? "text-amber-300" : "text-slate-300";
              return (
                <li key={e.id} className="flex gap-2 text-xs">
                  <span className="w-14 shrink-0 text-slate-500">{timeAgo(e.time)}</span>
                  <span className="shrink-0 font-medium text-white">{ag?.name}</span>
                  <span className={`truncate ${color}`}>{e.summary}</span>
                </li>
              );
            })}
          </ul>
        </Card>
      </div>

      <Card className="mt-6">
        <div className="mb-3 flex items-center justify-between">
          <h2 className="font-medium text-white">Latest incidents</h2>
          <Link to="/incidents" className="text-sm text-brand-400 hover:underline">Incident queue →</Link>
        </div>
        <ul className="divide-y divide-slate-800">
          {incidents.slice(0, 4).map((i) => (
            <li key={i.id} className="flex flex-wrap items-center gap-3 py-2.5 text-sm">
              <RiskBadge risk={i.severity} />
              <span className="flex-1 text-slate-200">{i.title}</span>
              <span className="text-xs text-slate-500">{agents.find((a) => a.id === i.agentId)?.name} · {timeAgo(i.time)}</span>
              <IncidentBadge status={i.status} />
            </li>
          ))}
        </ul>
      </Card>
    </>
  );
}
