import clsx from "clsx";
import type { ReactNode } from "react";
import type { AgentStatus, Enforcement, IncidentStatus, Risk, VulnStatus } from "../data/types";

export function Card({ className, children }: { className?: string; children: ReactNode }) {
  return <div className={clsx("rounded-xl border border-slate-800 bg-slate-900/60 p-5", className)}>{children}</div>;
}

export function PageHeader({ title, subtitle, actions }: { title: string; subtitle?: string; actions?: ReactNode }) {
  return (
    <div className="mb-6 flex flex-wrap items-end justify-between gap-4">
      <div>
        <h1 className="text-2xl font-semibold text-white">{title}</h1>
        {subtitle && <p className="mt-1 text-sm text-slate-400">{subtitle}</p>}
      </div>
      {actions && <div className="flex gap-2">{actions}</div>}
    </div>
  );
}

export function Stat({ label, value, hint, tone = "default", icon }: { label: string; value: ReactNode; hint?: string; tone?: "default" | "good" | "warn" | "bad"; icon?: ReactNode }) {
  const toneCls = { default: "text-white", good: "text-emerald-400", warn: "text-amber-400", bad: "text-rose-400" }[tone];
  return (
    <Card>
      <div className="flex items-center justify-between text-sm text-slate-400">
        <span>{label}</span>
        {icon}
      </div>
      <div className={clsx("mt-2 text-3xl font-semibold tabular-nums", toneCls)}>{value}</div>
      {hint && <div className="mt-1 text-xs text-slate-500">{hint}</div>}
    </Card>
  );
}

const riskCls: Record<Risk, string> = {
  low: "bg-emerald-500/10 text-emerald-300 ring-emerald-500/30",
  medium: "bg-amber-500/10 text-amber-300 ring-amber-500/30",
  high: "bg-orange-500/10 text-orange-300 ring-orange-500/30",
  critical: "bg-rose-500/15 text-rose-300 ring-rose-500/40",
};

export function Badge({ className, children }: { className?: string; children: ReactNode }) {
  return <span className={clsx("inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-xs font-medium ring-1 ring-inset", className)}>{children}</span>;
}

export const RiskBadge = ({ risk }: { risk: Risk }) => <Badge className={riskCls[risk]}>{risk}</Badge>;

const statusCls: Record<AgentStatus, string> = {
  active: "bg-emerald-500/10 text-emerald-300 ring-emerald-500/30",
  idle: "bg-slate-500/10 text-slate-300 ring-slate-500/30",
  paused: "bg-amber-500/10 text-amber-300 ring-amber-500/30",
  quarantined: "bg-rose-500/15 text-rose-300 ring-rose-500/40",
};
export function StatusBadge({ status }: { status: AgentStatus }) {
  return (
    <Badge className={statusCls[status]}>
      <span className={clsx("h-1.5 w-1.5 rounded-full", status === "active" ? "animate-pulse bg-emerald-400" : "bg-current")} />
      {status}
    </Badge>
  );
}

const incCls: Record<IncidentStatus, string> = {
  open: "bg-rose-500/10 text-rose-300 ring-rose-500/30",
  acknowledged: "bg-amber-500/10 text-amber-300 ring-amber-500/30",
  resolved: "bg-emerald-500/10 text-emerald-300 ring-emerald-500/30",
};
export const IncidentBadge = ({ status }: { status: IncidentStatus }) => <Badge className={incCls[status]}>{status}</Badge>;

const enfCls: Record<Enforcement, string> = {
  block: "bg-rose-500/10 text-rose-300 ring-rose-500/30",
  warn: "bg-amber-500/10 text-amber-300 ring-amber-500/30",
  monitor: "bg-sky-500/10 text-sky-300 ring-sky-500/30",
};
export const EnforcementBadge = ({ e }: { e: Enforcement }) => <Badge className={enfCls[e]}>{e}</Badge>;

const vulnCls: Record<VulnStatus, string> = {
  open: "bg-rose-500/10 text-rose-300 ring-rose-500/30",
  fixed: "bg-emerald-500/10 text-emerald-300 ring-emerald-500/30",
  ignored: "bg-slate-500/10 text-slate-400 ring-slate-500/30",
};
export const VulnStatusBadge = ({ s }: { s: VulnStatus }) => <Badge className={vulnCls[s]}>{s}</Badge>;

export function TrustMeter({ score }: { score: number }) {
  const color = score >= 80 ? "bg-emerald-400" : score >= 60 ? "bg-amber-400" : "bg-rose-400";
  return (
    <div className="flex items-center gap-2">
      <div className="h-1.5 w-20 overflow-hidden rounded-full bg-slate-800">
        <div className={clsx("h-full rounded-full", color)} style={{ width: `${score}%` }} />
      </div>
      <span className="w-7 text-right text-xs tabular-nums text-slate-300">{score}</span>
    </div>
  );
}

export function Button({
  children, onClick, variant = "secondary", type = "button", disabled,
}: { children: ReactNode; onClick?: () => void; variant?: "primary" | "secondary" | "danger" | "ghost"; type?: "button" | "submit"; disabled?: boolean }) {
  const cls = {
    primary: "bg-brand-600 text-white hover:bg-brand-500",
    secondary: "bg-slate-800 text-slate-200 hover:bg-slate-700",
    danger: "bg-rose-600/90 text-white hover:bg-rose-500",
    ghost: "text-slate-300 hover:bg-slate-800",
  }[variant];
  return (
    <button type={type} disabled={disabled} onClick={onClick} className={clsx("inline-flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-sm font-medium transition disabled:opacity-40", cls)}>
      {children}
    </button>
  );
}

export function timeAgo(t: number) {
  const s = Math.max(0, Math.round((Date.now() - t) / 1000));
  if (s < 60) return `${s}s ago`;
  const m = Math.round(s / 60);
  if (m < 60) return `${m}m ago`;
  const h = Math.round(m / 60);
  if (h < 48) return `${h}h ago`;
  return `${Math.round(h / 24)}d ago`;
}

export function Empty({ children }: { children: ReactNode }) {
  return <div className="rounded-lg border border-dashed border-slate-800 p-8 text-center text-sm text-slate-500">{children}</div>;
}
