import { ArrowLeft, ChevronDown, ChevronRight, FileCode2, RefreshCw } from "lucide-react";
import { useState } from "react";
import { Link, useParams } from "react-router-dom";
import { useFleet } from "../data/store";
import type { Risk, VulnStatus } from "../data/types";
import { Badge, Button, Card, Empty, PageHeader, RiskBadge, StatusBadge, VulnStatusBadge, timeAgo } from "../components/ui";

const sevRank: Record<Risk, number> = { critical: 0, high: 1, medium: 2, low: 3 };

export default function HarnessDetail() {
  const { id } = useParams();
  const { harnesses, agents, setVulnStatus, rescanHarness } = useFleet();
  const [filter, setFilter] = useState<VulnStatus | "all">("open");
  const [expanded, setExpanded] = useState<string | null>(null);
  const [scanning, setScanning] = useState(false);

  const h = harnesses.find((x) => x.id === id);
  if (!h) return <Empty>Repository not found. <Link to="/harnesses" className="text-brand-400">Back</Link></Empty>;

  const used = agents.filter((a) => a.harnessId === h.id);
  const vulns = h.vulns.filter((v) => filter === "all" || v.status === filter).sort((a, b) => sevRank[a.severity] - sevRank[b.severity]);

  const rescan = () => {
    setScanning(true);
    setTimeout(() => { rescanHarness(h.id); setScanning(false); }, 1500);
  };

  return (
    <>
      <Link to="/harnesses" className="mb-4 inline-flex items-center gap-1 text-sm text-slate-400 hover:text-white"><ArrowLeft className="h-4 w-4" /> Source code</Link>
      <PageHeader
        title={h.name}
        subtitle={`${h.repo} · ${h.framework} · ${h.language} · ${h.branch} · scanned ${timeAgo(h.lastScan)}`}
        actions={<Button onClick={rescan} disabled={scanning}><RefreshCw className={`h-4 w-4 ${scanning ? "animate-spin" : ""}`} /> {scanning ? "Scanning…" : "Rescan"}</Button>}
      />

      <div className="grid gap-4 lg:grid-cols-3">
        <div className="space-y-4 lg:col-span-2">
          <div className="flex gap-1">
            {(["open", "fixed", "ignored", "all"] as const).map((t) => (
              <button key={t} onClick={() => setFilter(t)} className={`rounded-lg px-3 py-1.5 text-sm capitalize ${filter === t ? "bg-slate-800 text-white" : "text-slate-400 hover:bg-slate-900"}`}>
                {t} <span className="text-xs text-slate-500">{t === "all" ? h.vulns.length : h.vulns.filter((v) => v.status === t).length}</span>
              </button>
            ))}
          </div>

          {vulns.length ? vulns.map((v) => {
            const isOpen = expanded === v.id;
            return (
              <Card key={v.id} className="p-0">
                <button onClick={() => setExpanded(isOpen ? null : v.id)} className="flex w-full items-start gap-3 p-4 text-left">
                  {isOpen ? <ChevronDown className="mt-0.5 h-4 w-4 text-slate-500" /> : <ChevronRight className="mt-0.5 h-4 w-4 text-slate-500" />}
                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <RiskBadge risk={v.severity} />
                      <Badge className="bg-slate-800 text-slate-300 ring-slate-700">{v.category}</Badge>
                      <VulnStatusBadge s={v.status} />
                    </div>
                    <div className="mt-1.5 font-medium text-slate-100">{v.title}</div>
                    <div className="mt-1 flex items-center gap-1 font-mono text-xs text-slate-500"><FileCode2 className="h-3 w-3" />{v.file}:{v.line} · {v.cwe}</div>
                  </div>
                </button>
                {isOpen && (
                  <div className="border-t border-slate-800 px-4 pb-4 pt-3 pl-11">
                    <div className="text-xs uppercase text-slate-500">Code</div>
                    <pre className="mt-1 overflow-x-auto rounded-lg bg-slate-950 p-3 font-mono text-xs text-rose-200"><span className="mr-3 select-none text-slate-600">{v.line}</span>{v.snippet}</pre>
                    <div className="mt-3 text-xs uppercase text-slate-500">How to fix</div>
                    <p className="mt-1 text-sm text-slate-300">{v.fix}</p>
                    <div className="mt-2 font-mono text-xs text-slate-500">rule: {v.ruleId}</div>
                    <div className="mt-4 flex gap-2">
                      {v.status !== "fixed" && <Button variant="primary" onClick={() => setVulnStatus(h.id, v.id, "fixed")}>Mark fixed</Button>}
                      {v.status !== "ignored" && <Button variant="ghost" onClick={() => setVulnStatus(h.id, v.id, "ignored")}>Ignore</Button>}
                      {v.status !== "open" && <Button variant="ghost" onClick={() => setVulnStatus(h.id, v.id, "open")}>Reopen</Button>}
                    </div>
                  </div>
                )}
              </Card>
            );
          }) : <Empty>No {filter === "all" ? "" : filter} vulnerabilities.</Empty>}
        </div>

        <div className="space-y-4">
          <Card>
            <div className="text-sm text-slate-400">Security score</div>
            <div className={`mt-1 text-4xl font-semibold ${h.securityScore >= 80 ? "text-emerald-400" : h.securityScore >= 60 ? "text-amber-400" : "text-rose-400"}`}>{h.securityScore}</div>
            <p className="mt-2 text-xs text-slate-500">Based on open findings, their severity and how long they have been open.</p>
          </Card>
          <Card>
            <h2 className="mb-3 font-medium text-white">Agents running this code</h2>
            {used.length ? (
              <ul className="space-y-2">
                {used.map((a) => (
                  <li key={a.id} className="flex items-center justify-between text-sm">
                    <Link to={`/agents/${a.id}`} className="text-brand-400 hover:underline">{a.name}</Link>
                    <StatusBadge status={a.status} />
                  </li>
                ))}
              </ul>
            ) : <p className="text-sm text-slate-500">No agents registered from this repo yet.</p>}
          </Card>
        </div>
      </div>
    </>
  );
}
