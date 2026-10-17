export function FormField({
  id,
  label,
  helper,
  error,
  nationalId = false,
  value,
  onChange,
  className = "",
  ...inputProps
}) {
  const helperId = helper ? `${id}-helper` : undefined;
  const errorId = error ? `${id}-error` : undefined;
  const describedBy = [helperId, errorId].filter(Boolean).join(" ") || undefined;

  const handleChange = (event) => {
    if (!nationalId) {
      onChange?.(event);
      return;
    }
    const digits = event.target.value.replace(/\D/g, "").slice(0, 9);
    onChange?.({ ...event, target: { ...event.target, value: digits, name: event.target.name } });
  };

  return (
    <div className={`grid gap-1.5 ${className}`}>
      <label htmlFor={id} className="text-sm font-semibold text-foreground">
        {label}
      </label>
      <input
        {...inputProps}
        id={id}
        value={value}
        onChange={handleChange}
        aria-invalid={error ? true : undefined}
        aria-describedby={describedBy}
        inputMode={nationalId ? "numeric" : inputProps.inputMode}
        autoComplete={nationalId ? "username" : inputProps.autoComplete}
        maxLength={nationalId ? 9 : inputProps.maxLength}
        pattern={nationalId ? "[0-9]{9}" : inputProps.pattern}
        dir={nationalId ? "ltr" : inputProps.dir}
        className="h-11 w-full rounded-sm border border-border bg-card px-3 text-sm text-foreground tabular-nums outline-none focus-visible:ring-2 focus-visible:ring-ring"
      />
      {helper ? (
        <p id={helperId} className="text-xs leading-relaxed text-muted-foreground">
          {helper}
        </p>
      ) : null}
      {error ? (
        <p id={errorId} className="text-xs font-semibold text-[color:var(--danger)]" role="alert">
          {error}
        </p>
      ) : null}
    </div>
  );
}
