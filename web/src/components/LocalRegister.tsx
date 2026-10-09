import { X } from "lucide-react";
import { useEffect, useState, type FormEvent } from "react";
import { useFleet } from "../data/store";
import { Button } from "./ui";
import { sourceRepositories, type SourceRepository } from "../data/sourceApi";

export default function LocalRegister({ onClose }: { onClose: () => void }) {
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
        <p className="mb-4 text-sm text-slate-400">Select a local checkout configured in the scanner. Scan its current working files with Semgrep; no source code is executed or uploaded. Results and triage are saved in this browser.</p>
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
