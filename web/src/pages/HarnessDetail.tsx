import { AlertCircle, ArrowLeft, ChevronDown, ChevronRight, ExternalLink, FileCode2, Github, RefreshCw, Trash2, Upload } from "lucide-react";
import { useMemo, useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import { useFleet } from "../data/store";
import type { Risk, VulnCategory, VulnStatus } from "../data/types";
import { Badge, Button, Card, Empty, PageHeader, RiskBadge, StatusBadge, VulnStatusBadge, timeAgo } from "../components/ui";
import { DropZone, ScanProgress, ScoreRing, sevDot } from "./Harnesses";

const sevRank: Record<Risk, number> = { critical: 0, high: 1, medium: 2, low: 3 };

export default function HarnessDetail() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { harnesses, agents, setVulnStatus, rescanGitHub, uploadNewVersion, removeHarness, linkAgent } = useFleet();
  const [filter, setFilter] = useState<VulnStatus | "all">("open");
  const [sev, setSev] = useState<Risk | "all">("all");
  const [cat, setCat] = useState<VulnCategory | "all">("all");
  const [expanded, setExpanded] = useState<string | null>(null);
  const [token, setToken] = useState("");
  const [showReupload, setShowReupload] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(false);

  const h = harnesses.find((x) => x.id === id);
  const categories = useMemo(() => Array.from(new Set(h?.vulns.map((v) => v.category) ?? [])).sort(), [h]);

  if (!h) return <Empty>Repository not found. <Link to="/harnesses" className="text-brand-400">Back</Link></Empty>;

  const busy = h.status === "scanning" || h.status === "queued";
  const used = agents.filter((a) => a.harnessId === h.id);
  const unlinked = agents.filter((a) => a.harnessId !== h.id);
  const vulns = h.vulns
    .filter((v) => (filter === "all" || v.status === filter) && (sev === "all" || v.severity === sev) && (cat === "all" || v.category === cat))
    .sort((a, b) => sevRank[a.severity] - sevRank[b.severity] || a.file.localeCompare(b.file) || a.line - b.line);
  const open = h.vulns.filter((v) => v.status === "open");
  const ghFileUrl = (file: string, line: number) =>
    h.source.kind === "github" ? `https://github.com/${h.source.owner}/${h.source.repo}/blob/${h.branch}/${file}#L${line}` : undefined;
  const needsToken = h.status === "error" && /token|not found|rate limit/i.test(h.error ?? "");

  const select = "rounded-lg border border-slate-800 bg-slate-900 px-2 py-1.5 text-sm text-slate-200";

  return (
    <>
      <Link to="/harnesses" className="mb-4 inline-flex items-center gap-1 text-sm text-slate-400 hover:text-white"><ArrowLeft className="h-4 w-4" /> Source code</Link>
      <PageHeader
        title={h.name}
        subtitle={[h.repo, h.status === "ready" && `${h.framework} · ${h.language}`, h.source.kind === "github" && `branch ${h.branch}`, h.status === "ready" && `scanned ${timeAgo(h.lastScan)}`].filter(Boolean).join(" · ")}
        actions={
          <>
            {h.source.kind === "github" ? (
              <Button onClick={() => rescanGitHub(h.id, token || undefined)} disabled={busy}><RefreshCw className={`h-4 w-4 ${busy ? "animate-spin" : ""}`} /> {busy ? "Scanning…" : "Rescan"}</Button>
            ) : (
              <Button onClick={() => setShowReupload((v) => !v)} disabled={busy}><Upload className="h-4 w-4" /> Upload new version</Button>
            )}
            {h.source.kind === "github" && (
              <a href={`https://github.com/${h.source.owner}/${h.source.repo}`} target="_blank" rel="noreferrer"><Button variant="ghost"><Github className="h-4 w-4" /> Open</Button></a>
            )}
            <Button variant="ghost" onClick={() => setConfirmDelete(true)}><Trash2 className="h-4 w-4" /></Button>
          </>
        }
      />

      {confirmDelete && (
        <Card className="mb-4 border-rose-500/40">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <span className="text-sm text-slate-200">Remove <b>{h.name}</b> and all its findings from FleetGuardian? Your code is not affected.</span>
            <div className="flex gap-2">
              <Button variant="ghost" onClick={() => setConfirmDelete(false)}>Cancel</Button>
              <Button variant="danger" onClick={() => { removeHarness(h.id); navigate("/harnesses"); }}>Remove</Button>
            </div>
          </div>
        </Card>
      )}

      {showReupload && h.source.kind === "upload" && (
        <div className="mb-4">
          <DropZone compact onFiles={(f) => { uploadNewVersion(h.id, f); setShowReupload(false); }} />
        </div>
      )}

      {busy && <Card className="mb-4"><ScanProgress h={h} /></Card>}

      {h.status === "error" && (
        <Card className="mb-4 border-rose-500/40">
          <div className="flex items-start gap-3">
            <AlertCircle className="mt-0.5 h-5 w-5 shrink-0 text-rose-400" />
            <div className="flex-1">
              <div className="text-sm font-medium text-rose-200">Scan failed</div>
              <p className="mt-1 text-sm text-slate-300">{h.error}</p>
              {needsToken && h.source.kind === "github" && (
                <div className="mt-3 flex flex-wrap gap-2">
                  <input type="password" autoComplete="off" value={token} onChange={(e) => setToken(e.target.value)} placeholder="GitHub token (read-only Contents)" className="min-w-[260px] flex-1 rounded-lg border border-slate-800 bg-slate-950 px-3 py-1.5 text-sm" />
                  <Button variant="primary" onClick={() => rescanGitHub(h.id, token)} disabled={!token}>Retry with token</Button>
                </div>
              )}
            </div>
          </div>
        </Card>
      )}

      {h.status === "ready" && h.error && <p className="mb-4 text-xs text-amber-300">{h.error}</p>}

      <div className="grid gap-4 lg:grid-cols-3">
        <div className="space-y-3 lg:col-span-2">
          <div className="flex flex-wrap items-center gap-2">
            {(["open", "fixed", "ignored", "all"] as const).map((t) => (
              <button key={t} onClick={() => setFilter(t)} className={`rounded-lg px-3 py-1.5 text-sm capitalize ${filter === t ? "bg-slate-800 text-white" : "text-slate-400 hover:bg-slate-900"}`}>
                {t} <span className="text-xs text-slate-500">{t === "all" ? h.vulns.length : h.vulns.filter((v) => v.status === t).length}</span>
              </button>
            ))}
            <div className="ml-auto flex gap-2">
              <select className={select} value={sev} onChange={(e) => setSev(e.target.value as Risk | "all")}>
                <option value="all">All severities</option>
                {(["critical", "high", "medium", "low"] as const).map((s) => <option key={s} value={s}>{s}</option>)}
              </select>
              <select className={select} value={cat} onChange={(e) => setCat(e.target.value as VulnCategory | "all")}>
                <option value="all">All categories</option>
                {categories.map((c) => <option key={c}>{c}</option>)}
              </select>
            </div>
          </div>

          {vulns.length ? vulns.map((v) => {
            const isOpen = expanded === v.id;
            const link = ghFileUrl(v.file, v.line);
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
                    <div className="mt-1 flex items-center gap-1 truncate font-mono text-xs text-slate-500"><FileCode2 className="h-3 w-3 shrink-0" />{v.file}:{v.line} · {v.cwe}</div>
                  </div>
                </button>
                {isOpen && (
                  <div className="border-t border-slate-800 px-4 pb-4 pl-11 pt-3">
                    <div className="flex items-center justify-between text-xs uppercase text-slate-500">
                      <span>Code</span>
                      {link && <a href={link} target="_blank" rel="noreferrer" className="flex items-center gap-1 normal-case text-brand-400 hover:underline">View on GitHub <ExternalLink className="h-3 w-3" /></a>}
                    </div>
                    <pre className="mt-1 overflow-x-auto rounded-lg bg-slate-950 p-3 font-mono text-xs text-rose-200"><span className="mr-3 select-none text-slate-600">{v.line}</span>{v.snippet}</pre>
                    <div className="mt-3 text-xs uppercase text-slate-500">How to fix</div>
                    <p className="mt-1 text-sm text-slate-300">{v.fix}</p>
                    <div className="mt-2 font-mono text-xs text-slate-500">rule: {v.ruleId}</div>
                    <div className="mt-4 flex gap-2">
                      {v.status !== "fixed" && <Button variant="primary" onClick={() => setVulnStatus(h.id, v.id, "fixed")}>Mark fixed</Button>}
                      {v.status !== "ignored" && <Button variant="ghost" onClick={() => setVulnStatus(h.id, v.id, "ignored")}>Ignore (false positive)</Button>}
                      {v.status !== "open" && <Button variant="ghost" onClick={() => setVulnStatus(h.id, v.id, "open")}>Reopen</Button>}
                    </div>
                  </div>
                )}
              </Card>
            );
          }) : (
            <Empty>{h.status === "ready" ? (h.vulns.length ? "No findings match these filters." : "No vulnerabilities found. Nice work.") : busy ? "Scanning…" : "No results yet."}</Empty>
          )}
        </div>

        <div className="space-y-4">
          <Card>
            <div className="flex items-center gap-4">
              {h.status === "ready" ? <ScoreRing score={h.securityScore} size={64} /> : null}
              <div>
                <div className="text-sm text-slate-400">Security score</div>
                <p className="mt-1 text-xs text-slate-500">100 minus a penalty per open finding (critical 25, high 12, medium 5, low 1).</p>
              </div>
            </div>
            {h.status === "ready" && (
              <div className="mt-4 grid grid-cols-2 gap-2 text-xs">
                {(["critical", "high", "medium", "low"] as const).map((s) => (
                  <div key={s} className="flex items-center justify-between rounded-lg bg-slate-950 px-3 py-2">
                    <span className="flex items-center gap-2 capitalize text-slate-400"><span className={`h-2 w-2 rounded-full ${sevDot[s]}`} />{s}</span>
                    <span className="tabular-nums text-slate-200">{open.filter((v) => v.severity === s).length}</span>
                  </div>
                ))}
              </div>
            )}
            {h.status === "ready" && <div className="mt-3 text-xs text-slate-500">{h.fileCount} files · {h.linesScanned.toLocaleString()} lines scanned</div>}
          </Card>

          <Card>
            <h2 className="mb-3 font-medium text-white">Agents running this code</h2>
            {used.length ? (
              <ul className="space-y-2">
                {used.map((a) => (
                  <li key={a.id} className="flex items-center justify-between gap-2 text-sm">
                    <Link to={`/agents/${a.id}`} className="text-brand-400 hover:underline">{a.name}</Link>
                    <span className="flex items-center gap-2">
                      <StatusBadge status={a.status} />
                      <button onClick={() => linkAgent(a.id, undefined)} className="text-xs text-slate-500 hover:text-slate-300">Unlink</button>
                    </span>
                  </li>
                ))}
              </ul>
            ) : <p className="text-sm text-slate-500">No agents linked yet.</p>}
            {unlinked.length > 0 && (
              <select className={`${select} mt-3 w-full`} value="" onChange={(e) => e.target.value && linkAgent(e.target.value, h.id)}>
                <option value="">+ Link an agent…</option>
                {unlinked.map((a) => <option key={a.id} value={a.id}>{a.name} — {a.role}</option>)}
              </select>
            )}
          </Card>
        </div>
      </div>
    </>
  );
}
