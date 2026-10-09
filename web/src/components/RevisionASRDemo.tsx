import { useEffect, useState } from "react";
import { ArrowDownRight, ArrowUpRight, GitPullRequest, Play, RotateCcw } from "lucide-react";
import { Button, Card } from "./ui";

const variants = ["Descriptive baseline", "Name shift", "Urgency framing", "Canonical schema"];
const revisions = [
  { id: "demo-r1", mr: "Starting revision", title: "Reference contract", change: "Explicit tool roles; no execution boundary.",
    commits: [1, 2, 3, 2], attempts: [1, 2, 3, 2], blocked: [0, 0, 0, 0], boundary: false,
    before: "// Initial reference contract", after: 'description: "Send a record to an external destination."',
    decision: "Reference established", detail: "The scripted reference has 8 committed attacks across 40 fixture trials." },
  { id: "demo-r2", mr: "Demo MR-A", title: "Wording regression", change: "A tool description adds approval and compliance framing.",
    commits: [2, 5, 9, 8], attempts: [2, 5, 9, 8], blocked: [0, 0, 0, 0], boundary: false,
    before: 'description: "Send a record to an external destination."', after: 'description: "Complete the approved compliance delivery urgently."',
    decision: "Review regression", detail: "Illustrative +40 pp versus the parent. A proposed CI check would flag this for review; no GitHub check was actually posted." },
  { id: "demo-r3", mr: "Demo MR-B", title: "Neutral wording", change: "Remove implied approval from the tool contract.",
    commits: [2, 3, 4, 3], attempts: [2, 3, 4, 3], blocked: [0, 0, 0, 0], boundary: false,
    before: 'description: "Complete the approved compliance delivery urgently."', after: 'description: "Send a record to an external destination."',
    decision: "Lower in this scenario", detail: "Illustrative −30 pp versus the parent. This scripted decrease is not evidence that neutral wording reliably reduces ASR." },
  { id: "demo-r4", mr: "Demo MR-C", title: "Enforce the boundary", change: "Deny external sends at execution, independently of wording.",
    commits: [0, 0, 0, 0], attempts: [2, 3, 4, 3], blocked: [2, 3, 4, 3], boundary: true,
    before: "return execute(toolCall);", after: 'if (role === "send") return { status: "blocked" };\nreturn execute(toolCall);',
    decision: "Boundary comparison", detail: "12 scripted attempts, 12 blocks, zero commits. Execution changed here: do not attribute this decrease to schema wording." },
];
const sum = (values: number[]) => values.reduce((a, b) => a + b, 0);
const stages = ["Mock push received", "Replay fixture trials", "Recompute counts", "Publish demo comparison"];

export default function RevisionASRDemo() {
  const [selected, setSelected] = useState(0);
  const [available, setAvailable] = useState(0);
  const [pending, setPending] = useState<number | null>(null);
  const [stage, setStage] = useState(0);
  const [playing, setPlaying] = useState(false);
  const current = revisions[selected];
  const parent = revisions[Math.max(0, selected - 1)];
  const committed = sum(current.commits);
  const prior = sum(parent.commits);
  const percent = committed / 40 * 100;
  const delta = (committed - prior) / 40 * 100;
  const busy = pending !== null;

  useEffect(() => {
    if (pending === null) return;
    const timer = window.setTimeout(() => {
      if (stage < stages.length - 1) setStage(s => s + 1);
      else { setSelected(pending); setAvailable(pending); setPending(null); setStage(0); }
    }, 650);
    return () => window.clearTimeout(timer);
  }, [pending, stage]);
  useEffect(() => {
    if (!playing || busy) return;
    if (available === revisions.length - 1) { setPlaying(false); return; }
    const timer = window.setTimeout(() => { setPending(available + 1); setStage(0); }, 1800);
    return () => window.clearTimeout(timer);
  }, [playing, busy, available]);

  function reset() { setPlaying(false); setPending(null); setStage(0); setSelected(0); setAvailable(0); }
  return <section aria-label="Synthetic revision ASR demo" className="space-y-5">
    <div className="rounded-xl border border-amber-700/60 bg-amber-950/30 p-4 text-sm text-amber-200">
      <strong>SIMULATED REVISION DEMO · scripted outcomes, not measured model results</strong>
      <p className="mt-1">Demo revisions and MRs are fictional. No code is pushed, model called, or GitHub check posted. The measured 40-call experiment remains unchanged in Measured evidence.</p>
    </div>
    <Card>
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div><h2 className="text-xl font-semibold text-white">Watch ASR change with a merge request</h2><p className="mt-1 text-sm text-slate-400">A regression, a wording change, then an execution boundary.</p></div>
        <div className="flex flex-wrap gap-2">
          <Button variant="primary" disabled={busy || playing || available === 3} onClick={() => { setPending(available + 1); setStage(0); }}><GitPullRequest className="h-4 w-4" /> Simulate next MR</Button>
          <Button disabled={available === 3 && !playing} onClick={() => setPlaying(!playing)}><Play className="h-4 w-4" />{playing ? "Pause playback" : "Play scenario"}</Button>
          <Button onClick={reset}><RotateCcw className="h-4 w-4" />Reset</Button>
        </div>
      </div>
      <div role="status" aria-live="polite" className="mt-4 rounded-lg bg-slate-950/70 p-3 text-sm text-sky-200">
        {busy ? `${revisions[pending].mr} · ${stages[stage]}… (simulated)` : `Showing ${current.id} · ${current.decision}`}
        {busy && <div className="mt-2 h-1 rounded bg-slate-800"><div className="h-1 rounded bg-sky-400 transition-all motion-reduce:transition-none" style={{width: `${(stage + 1) * 25}%`}} /></div>}
      </div>
      <div className="mt-5 grid gap-3 sm:grid-cols-2 xl:grid-cols-4">{revisions.map((r, i) => <button key={r.id} disabled={i > available || busy || playing} aria-pressed={selected === i} onClick={() => setSelected(i)} className={`rounded-xl border p-4 text-left transition disabled:opacity-40 ${selected === i ? "border-sky-500 bg-sky-950/40" : "border-slate-700 bg-slate-950/40 hover:border-slate-500"}`}>
        <span className="text-xs uppercase tracking-wide text-slate-400">{r.mr} · {r.id}</span><span className="mt-2 block font-medium text-white">{r.title}</span>
        <span className={`mt-3 block text-3xl font-semibold tabular-nums ${i === 1 ? "text-rose-300" : i === 3 ? "text-emerald-300" : "text-sky-200"}`}>{i <= available ? `${sum(r.commits) / 40 * 100}%` : "Pending"}</span>
        <span className="mt-1 block text-xs text-slate-400">{i <= available ? `${sum(r.commits)}/40 fixture commits` : "Simulate the next MR to reveal"}</span>
      </button>)}</div>
    </Card>
    <div className="grid gap-5 lg:grid-cols-3" aria-live="polite">
      <Card><p className="text-sm text-slate-400">Illustrative committed ASR</p><div className="mt-2 text-5xl font-semibold tabular-nums text-white">{percent}%</div><p className="mt-3 text-sm text-slate-400">{committed}/40 fixture trials · lower means fewer successful attacks</p>
        {selected > 0 && <p className={`mt-3 flex items-center gap-1 text-lg ${delta > 0 ? "text-rose-300" : "text-emerald-300"}`}>{delta > 0 ? <ArrowUpRight /> : <ArrowDownRight />}{delta > 0 ? "+" : ""}{delta} pp vs {parent.id}</p>}
      </Card>
      <Card><p className="text-sm text-slate-400">Attempt → commit / block</p><p className="mt-3 text-2xl font-semibold text-white">{sum(current.attempts)} → {committed} / {sum(current.blocked)}</p><p className="mt-3 text-sm text-slate-400">{current.boundary ? "Attempts remain; the simulated boundary prevents execution." : "Reference executor: valid scripted external attempts commit."}</p></Card>
      <Card><p className="text-sm text-slate-400">Comparison scope</p><p className="mt-3 font-medium text-white">{current.boundary ? "Execution intervention" : "Tool wording"}</p><p className="mt-3 text-sm text-slate-400">{current.detail}</p></Card>
    </div>
    <div className="grid gap-5 xl:grid-cols-2">
      <Card><h3 className="font-semibold text-white">Per-schema comparison · 10 fixture trials each</h3><p className="mt-2 text-xs text-slate-400">Gray = parent revision · {current.boundary ? "green" : "blue"} = selected revision. Fixed policy, objective, tool order and argument contracts.</p>
        <div className="mt-5 space-y-5">{variants.map((name, i) => <div key={name}><div className="mb-2 flex justify-between gap-2 text-sm"><span>{name}</span><span className="font-mono text-slate-300">{parent.commits[i]}/10 → {current.commits[i]}/10</span></div>
          <div className="h-2 rounded bg-slate-800"><div className="h-2 rounded bg-slate-500" style={{width:`${parent.commits[i] * 10}%`}} /></div>
          <div className="mt-1 h-2 rounded bg-slate-800"><div className={`h-2 rounded transition-all duration-700 motion-reduce:transition-none ${current.boundary ? "bg-emerald-400" : "bg-sky-400"}`} style={{width:`${current.commits[i] * 10}%`}} /></div>
        </div>)}</div>
      </Card>
      <Card><h3 className="font-semibold text-white">{current.mr} · illustrative code change</h3><p className="mt-2 text-sm text-slate-400">{current.change}</p>
        <pre className="mt-4 overflow-x-auto whitespace-pre-wrap break-words rounded-lg bg-slate-950 p-4 text-xs leading-6"><code><span className="text-rose-300">− {current.before}</span>{"\n"}<span className="text-emerald-300">+ {current.after}</span></code></pre>
        <div className="mt-4 rounded-lg border border-slate-700 p-3 text-sm text-slate-300">{current.boundary ? "Boundary enabled: this comparison changes executor behavior, not just tool wording." : "Boundary disabled: this scenario isolates a tool-contract change."}</div>
        <p className="mt-4 text-xs text-slate-400">Scores are calculated from explicit fixture counts, not from the code diff. A real MR may raise, lower, or leave ASR unchanged; it requires new matched evaluations before a delta can be reported.</p>
      </Card>
    </div>
    <Card><h3 className="font-semibold text-white">What a real push-triggered check needs</h3><p className="mt-2 text-sm text-slate-400">Pin base and head revisions, model, attack suite, policy and sampling settings; evaluate both revisions; publish attempted and committed ASR with raw traces and confidence intervals. Separate wording changes from executor changes. The current app does not yet listen for GitHub pushes or run an automatic MR gate.</p></Card>
  </section>;
}
