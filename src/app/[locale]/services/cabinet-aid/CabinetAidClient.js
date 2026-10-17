"use client";

import { useState } from "react";
import { useTranslations } from "next-intl";
import { Loader2 } from "lucide-react";
import { TatreezDivider } from "@/components/ui/TatreezDivider";
import { useAccreditationGate } from "@/hooks/useAccreditationGate";
import ProtectedAction from "@/components/auth/ProtectedAction";
import { useAuth } from "@/components/auth/AuthProvider";
import { useAuthModal } from "@/context/AuthModalContext";
import { submitCabinetHumanitarianRequest } from "@/app/actions";
import { toast } from "sonner";

const AID_TYPES = ["exceptional_medical", "home_reconstruction", "urgent_stipend", "education_grant"];
const URGENCY = ["critical", "high", "standard"];
const STEPS = ["submitted", "field_investigation", "approved_by_pm", "disbursed"];
const EASE = "transition-all duration-[250ms] ease-[cubic-bezier(0.16,1,0.3,1)] motion-reduce:transition-none";

export function CabinetAidClient({ cases = [] }) {
  const t = useTranslations("CabinetAid");
  const gateT = useTranslations("Common");
  const { ready, restricted } = useAccreditationGate();
  const locked = !ready || restricted;
  const guestT = useTranslations("GuestAuth");
  const { user, loading } = useAuth();
  const { openAuthModal } = useAuthModal();
  const [rows, setRows] = useState(cases);
  const [sending, setSending] = useState(false);

  const onSubmit = async (event) => {
    event.preventDefault();
    if (sending || locked) return;
    if (loading || !user) {
      if (!loading) openAuthModal({ title: guestT("gate_title"), description: guestT("gate_description") });
      return;
    }
    setSending(true);
    const form = event.currentTarget;
    const result = await submitCabinetHumanitarianRequest(new FormData(form));
    setSending(false);
    if (result?.success) {
      toast.success(`${t("sent")} ${result.caseNumber}`);
      const data = new FormData(form);
      setRows((prev) => [
        {
          id: result.caseNumber,
          case_number: result.caseNumber,
          aid_type: data.get("aidType"),
          urgency_level: data.get("urgency"),
          description: data.get("description"),
          status: "submitted",
          financial_grant_awarded: 0,
        },
        ...prev,
      ]);
      form.reset();
    } else toast.error(result?.error || t("empty"));
  };

  return (
    <div className="space-y-6">
      {ready && restricted ? (
        <p className="rounded-lg border border-[color:var(--warning)]/40 bg-[color:var(--warning)]/10 px-3 py-2 text-sm font-semibold text-foreground">{gateT("civil_accreditation_required")}</p>
      ) : null}
      {rows.length === 0 ? <p className="text-center text-foreground dark:text-zinc-400">{t("empty")}</p> : rows.map((row) => {
        const active = Math.max(0, STEPS.indexOf(row.status));
        const rejected = row.status === "rejected";
        return (
          <article key={row.id} className="rounded-lg border bg-card p-5 border-border">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <p className="break-all font-mono font-black text-[#b45309]">{row.case_number}</p>
              <span className={`rounded-full px-3 py-1 text-xs font-bold ${row.urgency_level === "critical" ? "bg-[#dc2626]/10 text-[#dc2626]" : "bg-amber-50 text-[#b45309] dark:bg-amber-950/40"}`}>
                {t(row.urgency_level)}
              </span>
            </div>
            <h2 className="mt-2 font-black text-[#064e3b] dark:text-emerald-50">{t(row.aid_type)}</h2>
            <p className="mt-2 break-words text-sm text-foreground dark:text-zinc-300">{row.description}</p>
            {rejected ? (
              <p className="mt-3 text-sm font-bold text-[#dc2626]">{t("rejected")}</p>
            ) : (
              <p className="mt-4 inline-flex rounded-full border border-border bg-muted px-3 py-1 text-xs font-bold text-foreground">{t(STEPS[active])}</p>
            )}
            <p className="mt-3 text-xs text-muted-foreground">{t("grant")}: {Number(row.financial_grant_awarded || 0).toFixed(2)}</p>
          </article>
        );
      })}
      <form onSubmit={onSubmit} className="space-y-4 rounded-lg border bg-card p-5 sm:p-6 border-border">
        <h2 className="text-lg font-black text-[#064e3b] dark:text-emerald-50">{t("apply")}</h2>
        <label className="block text-sm font-semibold">{t("aid_type")}
          <select name="aidType" className={`mt-1 w-full rounded-md border border-emerald-900/15 bg-white/90 px-4 py-3 dark:bg-zinc-950 ${EASE}`} defaultValue="exceptional_medical">
            {AID_TYPES.map((item) => <option key={item} value={item}>{t(item)}</option>)}
          </select>
        </label>
        <label className="block text-sm font-semibold">{t("urgency")}
          <select name="urgency" className={`mt-1 w-full rounded-md border border-emerald-900/15 bg-white/90 px-4 py-3 dark:bg-zinc-950 ${EASE}`} defaultValue="high">
            {URGENCY.map((item) => <option key={item} value={item}>{t(item)}</option>)}
          </select>
        </label>
        <label className="block text-sm font-semibold">{t("description")}
          <textarea name="description" required minLength={30} rows={4} className={`mt-1 w-full rounded-md border border-emerald-900/15 bg-white/90 px-4 py-3 dark:bg-zinc-950 ${EASE}`} />
        </label>
        <ProtectedAction className="block">
          <button type="submit" disabled={locked || sending} className={`flex w-full items-center justify-center gap-2 rounded-md border border-emerald-500/30 bg-primary px-6 py-4 font-semibold text-white hover:-translate-y-0.5 disabled:opacity-60 motion-reduce:hover:translate-y-0 ${EASE}`}>
            {sending ? <Loader2 className="h-4 w-4 animate-spin motion-reduce:animate-none" /> : null}
            {t("submit")}
          </button>
        </ProtectedAction>
      </form>
    </div>
  );
}
