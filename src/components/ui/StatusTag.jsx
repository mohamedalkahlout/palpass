import { CheckCircle2, CircleAlert, CircleDot, CircleX } from "lucide-react";

const STATES = {
  pending: {
    icon: CircleDot,
    className: "border-[color:var(--warning)]/40 bg-[color:var(--warning)]/10 text-[color:var(--warning)]",
  },
  active: {
    icon: CheckCircle2,
    className: "border-[color:var(--brand-700)]/30 bg-[color:var(--brand-700)]/10 text-[color:var(--brand-700)]",
  },
  resolved: {
    icon: CheckCircle2,
    className: "border-border bg-muted text-foreground",
  },
  rejected: {
    icon: CircleX,
    className: "border-[color:var(--danger)]/30 bg-[color:var(--danger)]/10 text-[color:var(--danger)]",
  },
};

export function StatusTag({ status = "pending", children, inverse = false }) {
  const state = STATES[status] || STATES.pending;
  const Icon = state.icon || CircleAlert;
  const tone = inverse
    ? "border-[#fafaf9]/40 bg-[#fafaf9]/10 text-[#fafaf9]"
    : state.className;
  return (
    <span className={`inline-flex items-center gap-1.5 rounded-sm border px-2 py-1 text-xs font-semibold ${tone}`}>
      <Icon className="h-3.5 w-3.5 shrink-0" aria-hidden />
      <span>{children}</span>
    </span>
  );
}
