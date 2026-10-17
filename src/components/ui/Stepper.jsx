export function Stepper({ steps = [], current = 0, label }) {
  return (
    <ol className="m-0 grid list-none gap-3 p-0" aria-label={label}>
      {steps.map((step, index) => {
        const active = index === current;
        const done = index < current;
        return (
          <li key={step.id || step} className="flex items-start gap-3">
            <span
              className={`inline-flex h-7 w-7 shrink-0 items-center justify-center rounded-sm border text-sm font-semibold tabular-nums ${
                active
                  ? "border-[color:var(--gold-700)] bg-[color:var(--gold-700)] text-white"
                  : done
                    ? "border-[color:var(--brand-700)] bg-[color:var(--brand-700)] text-white"
                    : "border-border bg-card text-muted-foreground"
              }`}
              aria-current={active ? "step" : undefined}
            >
              {index + 1}
            </span>
            <span className={`pt-0.5 text-sm leading-relaxed ${active ? "font-semibold text-foreground" : "text-muted-foreground"}`}>
              {step.label || step}
            </span>
          </li>
        );
      })}
    </ol>
  );
}
