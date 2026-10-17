"use client";

import { useTranslations } from "next-intl";
import { Button } from "@/components/ui/button";
import { useDialogKeys } from "@/components/ui/useDialogKeys";
import { Loader2, ShieldAlert } from "lucide-react";

export function SovereignConfirmModal({
  isOpen,
  title,
  description,
  authority,
  fee,
  legalWarning,
  onConfirm,
  onCancel,
  confirmLabel,
  isDestructive = false,
  loading = false,
}) {
  const t = useTranslations("Confirm");
  const dialogRef = useDialogKeys(isOpen, onCancel);
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[70] flex items-end justify-center bg-[#0c0f0e]/50 p-4 sm:items-center" role="presentation">
      <div
        ref={dialogRef}
        tabIndex={-1}
        role="dialog"
        aria-modal="true"
        aria-labelledby="sovereign-confirm-title"
        className="w-full max-w-lg overflow-hidden rounded-lg border border-border bg-card outline-none"
      >
        <div className="flex items-start gap-3 border-b border-border bg-[#064e3b] px-6 py-5 text-[#fafaf9]">
          <ShieldAlert className="mt-0.5 h-6 w-6 shrink-0 text-[#f59e0b]" />
          <div>
            <p className="text-xs font-semibold tracking-wide text-[#f59e0b]">{t("eyebrow")}</p>
            <h2 id="sovereign-confirm-title" className="text-xl font-bold">
              {title}
            </h2>
          </div>
        </div>
        <div className="space-y-4 px-6 py-5">
          {description ? <p className="text-sm leading-relaxed text-muted-foreground">{description}</p> : null}
          <dl className="space-y-3 rounded-lg border border-border bg-muted/40 p-4 text-sm">
            <div>
              <dt className="text-muted-foreground">{t("authority")}</dt>
              <dd className="font-semibold text-foreground">{authority}</dd>
            </div>
            <div>
              <dt className="text-muted-foreground">{t("financial")}</dt>
              <dd className="text-lg font-semibold tabular-nums text-[color:var(--gold-700)]">{fee}</dd>
            </div>
          </dl>
          <p className="rounded-lg border border-[color:var(--warning)]/40 bg-[color:var(--warning)]/10 p-4 text-sm leading-relaxed text-foreground">
            {legalWarning || t("legal_default")}
          </p>
          <div className="flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
            <Button type="button" variant="outline" className="rounded-lg" onClick={onCancel} disabled={loading}>
              {t("cancel")}
            </Button>
            <Button
              type="button"
              className={`rounded-lg font-semibold ${isDestructive ? "bg-[color:var(--danger)] text-white hover:bg-[color:var(--danger)]/90" : ""}`}
              onClick={onConfirm}
              disabled={loading}
            >
              {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : confirmLabel || t("confirm")}
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}
