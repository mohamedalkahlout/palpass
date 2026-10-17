import Image from "next/image";
import { Stepper } from "@/components/ui/Stepper";
import { TatreezDivider } from "@/components/ui/TatreezDivider";

export function ServicePage({
  title,
  authority,
  summary,
  steps = [],
  currentStep = 0,
  action,
  heroImage,
  children,
}) {
  return (
    <article className="page-wrap grid gap-6 py-8">
      {heroImage ? (
        <div className="relative h-32 sm:h-40 w-full rounded-2xl border border-emerald-950/10 dark:border-white/10 shadow-sm overflow-hidden mb-1">
          <Image
            src={heroImage.src}
            alt={heroImage.alt || title}
            fill
            sizes="(max-width: 768px) 100vw, 1200px"
            className="object-cover"
          />
          <div className="absolute inset-0 bg-gradient-to-t from-background/95 via-background/40 to-transparent" />
          <div className="absolute bottom-2.5 start-4 end-4 flex items-center justify-between text-xs font-semibold text-foreground">
            <span className="flex items-center gap-1.5 backdrop-blur-md bg-background/70 px-2.5 py-1 rounded-full border border-border/50 text-[11px]">
              <span className="w-1.5 h-1.5 rounded-full bg-primary" />
              <span>{authority || "دولة فلسطين"}</span>
            </span>
            <span className="font-mono text-[10px] text-muted-foreground backdrop-blur-md bg-background/70 px-2 py-0.5 rounded-full border border-border/50">PALPASS CIVIC</span>
          </div>
        </div>
      ) : null}
      <header className="border-b border-border pb-4">
        <p className="text-xs font-semibold tracking-wide text-[color:var(--brand-900)]">{authority}</p>
        <h1 className="mt-1 text-2xl font-bold text-foreground">{title}</h1>
        <TatreezDivider className="justify-start" />
      </header>
      {summary ? (
        <section className="grid gap-4 rounded-lg border border-border bg-card p-4 sm:grid-cols-2">
          <SummaryItem label={summary.feeLabel} value={summary.fee} numeric />
          <SummaryItem label={summary.durationLabel} value={summary.duration} />
          <SummaryItem label={summary.requirementsLabel} value={summary.requirements} />
          <SummaryItem label={summary.departmentLabel} value={summary.department} />
        </section>
      ) : null}
      {steps.length ? <Stepper steps={steps} current={currentStep} /> : null}
      {children}
      {action ? <div className="flex justify-start">{action}</div> : null}
    </article>
  );
}

function SummaryItem({ label, value, numeric = false }) {
  if (!label && !value) return null;
  return (
    <div>
      <p className="text-xs text-muted-foreground">{label}</p>
      <p className={`mt-1 text-sm font-semibold text-foreground ${numeric ? "tabular-nums" : ""}`}>{value}</p>
    </div>
  );
}
