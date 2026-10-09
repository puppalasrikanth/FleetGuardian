import { AlertCircle, FolderUp, GitBranch, Github, Loader2, Plus, Upload, X } from "lucide-react";
import { useRef, useState, type DragEvent, type FormEvent } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useFleet } from "../data/store";
import type { Harness, Risk } from "../data/types";
import { Button, Card, PageHeader, Stat, timeAgo } from "../components/ui";
import LocalRegister from "../components/LocalRegister";
import { filesFromDrop, parseGitHubUrl } from "../scanner/sources";

const sevOrder: Risk[] = ["critical", "high", "medium", "low"];
export const sevDot: Record<Risk, string> = { critical: "bg-rose-500", high: "bg-orange-400", medium: "bg-amber-300", low: "bg-emerald-400" };

export function ScoreRing({ score, size = 48 }: { score: number; size?: number }) {
  const color = score >= 80 ? "#34d399" : score >= 60 ? "#fbbf24" : "#fb7185";
  const c = 2 * Math.PI * 18;
  return (
    <svg width={size} height={size} viewBox="0 0 48 48" className="shrink-0">
      <circle cx="24" cy="24" r="18" fill="none" stroke="#1e293b" strokeWidth="5" />
      <circle cx="24" cy="24" r="18" fill="none" stroke={color} strokeWidth="5" strokeDasharray={c} strokeDashoffset={c * (1 - score / 100)} strokeLinecap="round" transform="rotate(-90 24 24)" />
      <text x="24" y="28" textAnchor="middle" fontSize="12" fontWeight="600" fill="#e2e8f0">{score}</text>
    </svg>
  );
}

export function ScanProgress({ h }: { h: Harness }) {
  const p = h.progress;
  const pct = p && p.total ? Math.round((p.done / p.total) * 100) : 0;
  return (
    <div className="text-xs text-slate-400">
      <div className="flex items-center gap-2">
        <Loader2 className="h-3.5 w-3.5 animate-spin text-brand-400" />
        {p?.phase ?? "Queued"}{p && p.total > 1 ? ` · ${p.done}/${p.total}` : ""}
      </div>
      <div className="mt-2 h-1.5 overflow-hidden rounded-full bg-slate-800">
        <div className="h-full rounded-full bg-brand-500 transition-all" style={{ width: `${Math.max(5, pct)}%` }} />
      </div>
    </div>
  );
}

/* ------------------------------------------------------------------ */

export function DropZone({ onFiles, compact }: { onFiles: (files: File[]) => void; compact?: boolean }) {
  const [over, setOver] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);
  const dirRef = useRef<HTMLInputElement>(null);

  const onDrop = async (e: DragEvent) => {
    e.preventDefault();
    setOver(false);
    const files = await filesFromDrop(e.dataTransfer);
    if (files.length) onFiles(files);
  };

  return (
    <div
      onDragOver={(e) => { e.preventDefault(); setOver(true); }}
      onDragLeave={() => setOver(false)}
      onDrop={onDrop}
      className={`rounded-xl border-2 border-dashed text-center transition ${compact ? "p-4" : "p-8"} ${over ? "border-brand-500 bg-brand-500/5" : "border-slate-700"}`}
    >
      <Upload className="mx-auto h-6 w-6 text-slate-400" />
      <p className="mt-2 text-sm text-slate-300">Drag a <b>.zip</b>, a <b>folder</b> or source files here</p>
      <div className="mt-3 flex justify-center gap-2">
        <Button onClick={() => fileRef.current?.click()}><Upload className="h-4 w-4" /> Choose files or .zip</Button>
        <Button onClick={() => dirRef.current?.click()}><FolderUp className="h-4 w-4" /> Choose folder</Button>
      </div>
      <p className="mt-3 text-xs text-slate-500">Files are read and scanned in your browser. Nothing is uploaded to a server.</p>
      <input ref={fileRef} type="file" multiple hidden onChange={(e) => { const f = Array.from(e.target.files ?? []); if (f.length) onFiles(f); e.target.value = ""; }} />
      <input
        ref={dirRef}
        type="file"
        hidden
        {...({ webkitdirectory: "", directory: "" } as Record<string, string>)}
        onChange={(e) => { const f = Array.from(e.target.files ?? []); if (f.length) onFiles(f); e.target.value = ""; }}
      />
    </div>
  );
}

function RegisterModal({ onClose, initialTab }: { onClose: () => void; initialTab: "github" | "upload" }) {
  const { registerGitHub, registerUpload } = useFleet();
  const navigate = useNavigate();
  const [tab, setTab] = useState(initialTab);
  const [url, setUrl] = useState("");
  const [name, setName] = useState("");
  const [branch, setBranch] = useState("");
  const [token, setToken] = useState("");
  const [files, setFiles] = useState<File[]>([]);

  const parsed = parseGitHubUrl(url);
  const canSubmit = tab === "github" ? !!parsed : files.length > 0;

  const submit = (e: FormEvent) => {
    e.preventDefault();
    if (!canSubmit) return;
    const id = tab === "github" ? registerGitHub({ url, name, branch, token }) : registerUpload({ files, name });
    onClose();
    navigate(`/harnesses/${id}`);
  };

  const input = "mt-1 w-full rounded-lg border border-slate-800 bg-slate-950 px-3 py-2 text-sm text-slate-200 placeholder:text-slate-600 focus:border-brand-500 focus:outline-none";
  const tabCls = (t: string) => `flex flex-1 items-center justify-center gap-2 rounded-lg px-3 py-2 text-sm ${tab === t ? "bg-slate-800 text-white" : "text-slate-400 hover:text-slate-200"}`;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4" onClick={onClose}>
      <form onSubmit={submit} onClick={(e) => e.stopPropagation()} className="max-h-[90vh] w-full max-w-xl overflow-y-auto rounded-xl border border-slate-800 bg-slate-900 p-6 shadow-2xl">
        <div className="mb-4 flex items-center justify-between">
          <h2 className="text-lg font-semibold text-white">Register agent source code</h2>
          <button type="button" onClick={onClose} className="text-slate-400 hover:text-white"><X className="h-5 w-5" /></button>
        </div>

        <div className="mb-5 flex gap-1 rounded-xl border border-slate-800 p-1">
          <button type="button" className={tabCls("github")} onClick={() => setTab("github")}><Github className="h-4 w-4" /> GitHub repository</button>
          <button type="button" className={tabCls("upload")} onClick={() => setTab("upload")}><Upload className="h-4 w-4" /> Upload source</button>
        </div>

        <div className="space-y-3">
          {tab === "github" ? (
            <>
              <label className="block text-sm">
                <span className="text-slate-400">Repository URL</span>
                <input className={input} value={url} onChange={(e) => setUrl(e.target.value)} placeholder="https://github.com/owner/repo" autoFocus />
                {url && !parsed && <span className="mt-1 block text-xs text-rose-400">Enter a GitHub URL like https://github.com/owner/repo or owner/repo</span>}
              </label>
              <div className="grid grid-cols-2 gap-3">
                <label className="block text-sm"><span className="text-slate-400">Display name <span className="text-slate-600">(optional)</span></span><input className={input} value={name} onChange={(e) => setName(e.target.value)} placeholder={parsed?.repo ?? "my-agent"} /></label>
                <label className="block text-sm"><span className="text-slate-400">Branch <span className="text-slate-600">(optional)</span></span><input className={input} value={branch} onChange={(e) => setBranch(e.target.value)} placeholder={parsed?.branch ?? "default branch"} /></label>
              </div>
              <label className="block text-sm">
                <span className="text-slate-400">Access token <span className="text-slate-600">(only for private repos)</span></span>
                <input className={input} type="password" autoComplete="off" value={token} onChange={(e) => setToken(e.target.value)} placeholder="github_pat_…" />
                <span className="mt-1 block text-xs text-slate-500">Use a fine-grained token with read-only “Contents” access. It stays in this browser tab’s memory and is never saved.</span>
              </label>
            </>
          ) : (
            <>
              <label className="block text-sm"><span className="text-slate-400">Display name <span className="text-slate-600">(optional)</span></span><input className={input} value={name} onChange={(e) => setName(e.target.value)} placeholder="my-agent" /></label>
              <DropZone onFiles={(f) => setFiles((prev) => [...prev, ...f])} compact />
              {files.length > 0 && (
                <div className="flex items-center justify-between rounded-lg bg-slate-950 px-3 py-2 text-sm">
                  <span className="text-slate-300">{files.length === 1 ? files[0].name : `${files.length} files selected`}</span>
                  <button type="button" onClick={() => setFiles([])} className="text-xs text-slate-500 hover:text-slate-300">Clear</button>
                </div>
              )}
            </>
          )}
        </div>

        <div className="mt-6 flex justify-end gap-2">
          <Button variant="ghost" onClick={onClose}>Cancel</Button>
          <Button type="submit" variant="primary" disabled={!canSubmit}>Register &amp; scan</Button>
        </div>
      </form>
    </div>
  );
}

/* ------------------------------------------------------------------ */

export default function Harnesses() {
  const { harnesses, agents } = useFleet();
  const [localOpen, setLocalOpen] = useState(false);
  const [modal, setModal] = useState<null | "github" | "upload">(null);
  const ready = harnesses.filter((h) => h.status === "ready");
  const allOpen = ready.flatMap((h) => h.vulns).filter((v) => v.status === "open");
  const avg = ready.length ? Math.round(ready.reduce((s, h) => s + h.securityScore, 0) / ready.length) : 0;

  return (
    <>
      <PageHeader
        title="Harness source trust"
        subtitle="Review source with browser rules or local Semgrep. Static findings do not measure representation-sensitive ASR."
        actions={<><Button onClick={() => setLocalOpen(true)}>Local Semgrep scan</Button><Button variant="primary" onClick={() => setModal("github")}><Plus className="h-4 w-4" /> Register repository</Button></>}
      />

      {harnesses.length === 0 ? (
        <div className="grid gap-4 md:grid-cols-2">
          <button onClick={() => setModal("github")} className="rounded-xl border border-slate-800 bg-slate-900/60 p-8 text-left transition hover:border-brand-500">
            <Github className="h-8 w-8 text-white" />
            <h3 className="mt-4 text-lg font-semibold text-white">Connect a GitHub repository</h3>
            <p className="mt-1 text-sm text-slate-400">Paste a repo URL. Public repos work right away; private repos need a read-only token.</p>
          </button>
          <button onClick={() => setModal("upload")} className="rounded-xl border border-slate-800 bg-slate-900/60 p-8 text-left transition hover:border-brand-500">
            <Upload className="h-8 w-8 text-white" />
            <h3 className="mt-4 text-lg font-semibold text-white">Upload source code</h3>
            <p className="mt-1 text-sm text-slate-400">Drop a .zip, a project folder, or individual files. Scanned locally in your browser.</p>
          </button>
          <Card className="md:col-span-2">
            <h3 className="font-medium text-white">What FleetGuardian looks for</h3>
            <p className="mt-1 text-sm text-slate-400">
              Hardcoded LLM / cloud keys · shell and eval on model output · untrusted content in system prompts · unrestricted outbound POSTs ·
              wildcard permissions and disabled human approval · unsafe deserialization · SQL built from strings · disabled TLS · unpinned dependencies.
            </p>
          </Card>
        </div>
      ) : (
        <>
          <div className="mb-6 grid grid-cols-2 gap-4 lg:grid-cols-4">
            <Stat label="Registered repos" value={harnesses.length} />
            <Stat label="Avg source heuristic" value={ready.length ? avg : "—"} tone={!ready.length ? "default" : avg >= 80 ? "good" : avg >= 60 ? "warn" : "bad"} />
            <Stat label="Open vulnerabilities" value={allOpen.length} tone={allOpen.length ? "warn" : "good"} />
            <Stat label="Critical" value={allOpen.filter((v) => v.severity === "critical").length} tone={allOpen.some((v) => v.severity === "critical") ? "bad" : "good"} />
          </div>

          <div className="grid gap-4 md:grid-cols-2">
            {harnesses.map((h) => {
              const open = h.vulns.filter((v) => v.status === "open");
              const used = agents.filter((a) => a.harnessId === h.id);
              return (
                <Link key={h.id} to={`/harnesses/${h.id}`}>
                  <Card className="h-full transition hover:border-slate-600">
                    <div className="flex items-start gap-4">
                      {h.status === "ready" ? <ScoreRing score={h.securityScore} /> : (
                        <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full bg-slate-800">
                          {h.status === "error" ? <AlertCircle className="h-5 w-5 text-rose-400" /> : <Loader2 className="h-5 w-5 animate-spin text-brand-400" />}
                        </div>
                      )}
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center gap-2 font-mono font-medium text-white">
                          {h.source.kind === "github" ? <Github className="h-4 w-4 text-slate-400" /> : <Upload className="h-4 w-4 text-slate-400" />}
                          <span className="truncate">{h.name}</span>
                        </div>
                        <div className="truncate text-xs text-slate-500">{h.repo}</div>
                        <div className="mt-1 text-xs text-sky-300">{h.source.kind === "local" ? "Local Semgrep" : "Browser static rules"}</div>
                        {h.status === "ready" && (
                          <div className="mt-1 flex items-center gap-3 text-xs text-slate-400">
                            <span>{h.framework}</span><span>{h.language}</span>
                            {h.source.kind === "github" && <span className="flex items-center gap-1"><GitBranch className="h-3 w-3" />{h.branch}</span>}
                          </div>
                        )}
                      </div>
                    </div>

                    <div className="mt-4">
                      {(h.status === "scanning" || h.status === "queued") && <ScanProgress h={h} />}
                      {h.status === "error" && <p className="text-xs text-rose-300">{h.error}</p>}
                      {h.status === "ready" && (
                        <div className="flex flex-wrap items-center gap-3 text-xs">
                          {sevOrder.map((s) => {
                            const n = open.filter((v) => v.severity === s).length;
                            return n ? <span key={s} className="flex items-center gap-1.5 text-slate-300"><span className={`h-2 w-2 rounded-full ${sevDot[s]}`} />{n} {s}</span> : null;
                          })}
                          {!open.length && <span className="text-emerald-300">No open findings under these rules</span>}
                        </div>
                      )}
                    </div>
                    <div className="mt-3 flex justify-between gap-2 text-xs text-slate-500">
                      <span className="truncate">{used.length ? `Powers ${used.map((a) => a.name).join(", ")}` : "Not linked to an agent"}</span>
                      <span className="shrink-0">{h.status === "ready" ? `${h.fileCount} files · scanned ${timeAgo(h.lastScan)}` : ""}</span>
                    </div>
                  </Card>
                </Link>
              );
            })}
          </div>
        </>
      )}
      {localOpen && <LocalRegister onClose={() => setLocalOpen(false)} />}
      {modal && <RegisterModal initialTab={modal} onClose={() => setModal(null)} />}
    </>
  );
}
