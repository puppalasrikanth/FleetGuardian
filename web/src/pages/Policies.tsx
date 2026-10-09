import { Plus, X } from "lucide-react";
import { useState, type FormEvent } from "react";
import { useFleet } from "../data/store";
import type { Enforcement, Policy, PolicyCategory } from "../data/types";
import { Badge, Button, Card, EnforcementBadge, PageHeader, timeAgo } from "../components/ui";

const categories: PolicyCategory[] = ["Tools", "Spend", "Data", "Behavior", "Network"];
const catColor: Record<PolicyCategory, string> = {
  Tools: "bg-sky-500/10 text-sky-300 ring-sky-500/30",
  Spend: "bg-emerald-500/10 text-emerald-300 ring-emerald-500/30",
  Data: "bg-violet-500/10 text-violet-300 ring-violet-500/30",
  Behavior: "bg-amber-500/10 text-amber-300 ring-amber-500/30",
  Network: "bg-pink-500/10 text-pink-300 ring-pink-500/30",
};

function Toggle({ on, onClick }: { on: boolean; onClick: () => void }) {
  return (
    <button onClick={onClick} aria-pressed={on} className={`relative h-5 w-9 rounded-full transition ${on ? "bg-brand-600" : "bg-slate-700"}`}>
      <span className={`absolute top-0.5 h-4 w-4 rounded-full bg-white transition ${on ? "left-[18px]" : "left-0.5"}`} />
    </button>
  );
}

function PolicyForm({ onClose }: { onClose: () => void }) {
  const { upsertPolicy, agents } = useFleet();
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [category, setCategory] = useState<PolicyCategory>("Tools");
  const [enforcement, setEnforcement] = useState<Enforcement>("warn");
  const [scopeAll, setScopeAll] = useState(true);
  const [scope, setScope] = useState<string[]>([]);

  const submit = (e: FormEvent) => {
    e.preventDefault();
    if (!name.trim()) return;
    const p: Policy = {
      id: `p-${Date.now()}`, name, description, category, enforcement, enabled: true,
      scope: scopeAll ? "all" : scope, triggers24h: 0, updatedAt: Date.now(),
    };
    upsertPolicy(p);
    onClose();
  };

  const input = "w-full rounded-lg border border-slate-800 bg-slate-950 px-3 py-2 text-sm text-slate-200 focus:border-brand-500 focus:outline-none";

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4" onClick={onClose}>
      <form onSubmit={submit} onClick={(e) => e.stopPropagation()} className="w-full max-w-lg rounded-xl border border-slate-800 bg-slate-900 p-6 shadow-2xl">
        <div className="mb-4 flex items-center justify-between">
          <h2 className="text-lg font-semibold text-white">New guardrail</h2>
          <button type="button" onClick={onClose} className="text-slate-400 hover:text-white"><X className="h-5 w-5" /></button>
        </div>
        <div className="space-y-4">
          <label className="block text-sm">
            <span className="text-slate-400">Name</span>
            <input className={`${input} mt-1`} value={name} onChange={(e) => setName(e.target.value)} placeholder="e.g. No production database writes" autoFocus />
          </label>
          <label className="block text-sm">
            <span className="text-slate-400">What should agents (not) do?</span>
            <textarea className={`${input} mt-1`} rows={3} value={description} onChange={(e) => setDescription(e.target.value)} />
          </label>
          <div className="grid grid-cols-2 gap-3">
            <label className="block text-sm">
              <span className="text-slate-400">Category</span>
              <select className={`${input} mt-1`} value={category} onChange={(e) => setCategory(e.target.value as PolicyCategory)}>
                {categories.map((c) => <option key={c}>{c}</option>)}
              </select>
            </label>
            <label className="block text-sm">
              <span className="text-slate-400">When violated</span>
              <select className={`${input} mt-1`} value={enforcement} onChange={(e) => setEnforcement(e.target.value as Enforcement)}>
                <option value="block">Block the action</option>
                <option value="warn">Warn & ask a human</option>
                <option value="monitor">Monitor only</option>
              </select>
            </label>
          </div>
          <div className="text-sm">
            <span className="text-slate-400">Applies to</span>
            <div className="mt-2 flex gap-4">
              <label className="flex items-center gap-2"><input type="radio" checked={scopeAll} onChange={() => setScopeAll(true)} /> All agents</label>
              <label className="flex items-center gap-2"><input type="radio" checked={!scopeAll} onChange={() => setScopeAll(false)} /> Selected agents</label>
            </div>
            {!scopeAll && (
              <div className="mt-2 flex flex-wrap gap-2">
                {agents.map((a) => {
                  const on = scope.includes(a.id);
                  return (
                    <button type="button" key={a.id} onClick={() => setScope(on ? scope.filter((x) => x !== a.id) : [...scope, a.id])}
                      className={`rounded-full px-3 py-1 text-xs ring-1 ${on ? "bg-brand-600/20 text-brand-100 ring-brand-500" : "text-slate-400 ring-slate-700"}`}>
                      {a.name}
                    </button>
                  );
                })}
              </div>
            )}
          </div>
        </div>
        <div className="mt-6 flex justify-end gap-2">
          <Button onClick={onClose} variant="ghost">Cancel</Button>
          <Button type="submit" variant="primary" disabled={!name.trim()}>Create guardrail</Button>
        </div>
      </form>
    </div>
  );
}

export default function Policies() {
  const { policies, togglePolicy, agents } = useFleet();
  const [open, setOpen] = useState(false);
  const [cat, setCat] = useState<PolicyCategory | "All">("All");
  const rows = policies.filter((p) => cat === "All" || p.category === cat);

  return (
    <>
      <PageHeader
        title="Policies & guardrails"
        subtitle="The rules every agent in the fleet must follow."
        actions={<Button variant="primary" onClick={() => setOpen(true)}><Plus className="h-4 w-4" /> New guardrail</Button>}
      />
      <div className="mb-4 flex flex-wrap gap-1">
        {(["All", ...categories] as const).map((c) => (
          <button key={c} onClick={() => setCat(c)} className={`rounded-lg px-3 py-1.5 text-sm ${cat === c ? "bg-slate-800 text-white" : "text-slate-400 hover:bg-slate-900"}`}>{c}</button>
        ))}
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        {rows.map((p) => (
          <Card key={p.id} className={p.enabled ? "" : "opacity-60"}>
            <div className="flex items-start justify-between gap-4">
              <div>
                <div className="flex flex-wrap items-center gap-2">
                  <Badge className={catColor[p.category]}>{p.category}</Badge>
                  <EnforcementBadge e={p.enforcement} />
                </div>
                <h3 className="mt-2 font-medium text-white">{p.name}</h3>
              </div>
              <Toggle on={p.enabled} onClick={() => togglePolicy(p.id)} />
            </div>
            <p className="mt-2 text-sm text-slate-400">{p.description}</p>
            <div className="mt-4 flex flex-wrap items-center justify-between gap-2 text-xs text-slate-500">
              <span>
                Applies to{" "}
                {p.scope === "all" ? "all agents" : p.scope.map((id) => agents.find((a) => a.id === id)?.name).filter(Boolean).join(", ")}
              </span>
              <span>{p.triggers24h} triggers in 24h · updated {timeAgo(p.updatedAt)}</span>
            </div>
          </Card>
        ))}
      </div>
      {open && <PolicyForm onClose={() => setOpen(false)} />}
    </>
  );
}
