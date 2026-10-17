"use client";

import { useState } from "react";
import { useTranslations } from "next-intl";
import { usePathname, useRouter } from "@/i18n/routing";
import { Loader2, SearchCheck, SearchX } from "lucide-react";
import { FormField } from "@/components/ui/FormField";
import { StatusTag } from "@/components/ui/StatusTag";
import { Stepper } from "@/components/ui/Stepper";

const REFERENCE_PATTERN = /^(PAL-?CAB|REF-?BOR|PAL-?TAX|PAL-?EDU)-?[A-Z0-9]{3,}$/i;

const STATUS_KEYS = {
  pending: "status_pending",
  active: "status_active",
  resolved: "status_resolved",
  rejected: "status_rejected",
};

function daysFrom(value) {
  if (!value) return null;
  const date = new Date(value.length <= 10 ? `${value}T00:00:00` : value);
  if (Number.isNaN(date.getTime())) return null;
  return Math.ceil((date.getTime() - Date.now()) / 86400000);
}

export function TrackPortal({ initialRef = "", result = null }) {
  const t = useTranslations("Track");
  const router = useRouter();
  const pathname = usePathname();
  const [value, setValue] = useState(initialRef);
  const [touched, setTouched] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [pending, setPending] = useState(false);

  const valid = REFERENCE_PATTERN.test(value);
  const showError = (touched || submitted) && value.trim().length > 0 && !valid;

  const onSubmit = (event) => {
    event.preventDefault();
    setSubmitted(true);
    const ref = value.trim().toUpperCase();
    if (!REFERENCE_PATTERN.test(ref)) return;
    setPending(true);
    router.push(`${pathname}?ref=${encodeURIComponent(ref)}`);
  };

  const steps = [
    { id: "stage-1", label: t("stage_1") },
    { id: "stage-2", label: t("stage_2") },
    { id: "stage-3", label: t("stage_3") },
  ];

  return (
    <div className="grid gap-6">
      <form onSubmit={onSubmit} className="grid gap-4 rounded-lg border border-border bg-card p-5">
        <div className="flex items-center gap-2 text-[color:var(--brand-900)]">
          <SearchCheck className="h-5 w-5" aria-hidden />
          <h2 className="text-base font-semibold">{t("lookup_title")}</h2>
        </div>
        <p className="text-sm leading-relaxed text-muted-foreground">{t("lookup_helper")}</p>
        <div className="grid gap-3 min-[640px]:grid-cols-[1fr_auto] min-[640px]:items-end">
          <FormField
            id="track-reference"
            label={t("ref_label")}
            helper={t("ref_helper")}
            error={showError ? t("ref_invalid") : ""}
            value={value}
            onChange={(event) => setValue(event.target.value.toUpperCase().replace(/[^A-Z0-9-]/g, ""))}
            onBlur={() => setTouched(true)}
            placeholder={t("ref_placeholder")}
            dir="ltr"
          />
          <button
            type="submit"
            disabled={pending}
            className="inline-flex h-11 items-center justify-center gap-2 rounded-lg bg-[color:var(--brand-900)] px-4 text-sm font-semibold text-white disabled:opacity-60"
          >
            {pending ? <Loader2 className="h-4 w-4 animate-spin" aria-hidden /> : null}
            {t("submit")}
          </button>
        </div>
      </form>

      {result && result.found ? (
        <article className="grid gap-5 rounded-lg border border-border bg-card p-5">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <p className="text-xs text-muted-foreground">{t("reference_label")}</p>
              <p className="mt-1 break-all font-mono text-lg font-bold tabular-nums text-foreground">
                {result.reference}
              </p>
            </div>
            <StatusTag status={result.statusKey}>{t(STATUS_KEYS[result.statusKey] || "status_pending")}</StatusTag>
          </div>

          <dl className="grid gap-3 min-[640px]:grid-cols-3">
            <Row label={t("authority_label")} value={t(`kind_${result.kind}`)} />
            {result.title ? <Row label={t("subject_label")} value={result.title} /> : null}
            {result.subject ? <Row label={t("detail_label")} value={result.subject} /> : null}
            {result.slaDue ? <Row label={t("due_label")} value={formatDue(result.slaDue, t)} /> : null}
          </dl>

          <div className="border-t border-border pt-4">
            <p className="mb-3 text-xs font-semibold text-foreground">{t("progress_label")}</p>
            <Stepper steps={steps} current={result.stage} label={t("progress_label")} />
          </div>

          <p className="text-xs leading-relaxed text-muted-foreground">{t("result_note")}</p>
        </article>
      ) : null}

      {result && !result.found ? (
        <div className="flex items-start gap-3 rounded-lg border border-[color:var(--danger)]/30 bg-card p-5">
          <SearchX className="mt-0.5 h-5 w-5 shrink-0 text-[color:var(--danger)]" aria-hidden />
          <div>
            <p className="text-sm font-semibold text-foreground">{t("notfound_title")}</p>
            <p className="mt-1 text-sm leading-relaxed text-muted-foreground">
              {t(
                result.reason === "invalid_format"
                  ? "invalid_format"
                  : result.reason === "unavailable" || result.reason === "rate_limited"
                    ? "unavailable"
                    : "not_found"
              )}
            </p>
          </div>
        </div>
      ) : null}

      {!result ? (
        <div className="rounded-lg border border-dashed border-border bg-card p-5 text-sm leading-relaxed text-muted-foreground">
          {t("idle")}
        </div>
      ) : null}
    </div>
  );
}

function formatDue(value, t) {
  const left = daysFrom(value);
  if (left == null) return "—";
  if (left < 0) return t("overdue");
  return t("days_left", { days: left });
}

function Row({ label, value }) {
  return (
    <div>
      <dt className="text-xs text-muted-foreground">{label}</dt>
      <dd className="mt-1 break-words text-sm font-semibold text-foreground">{value}</dd>
    </div>
  );
}
