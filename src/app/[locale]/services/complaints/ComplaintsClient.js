"use client";

import { useEffect, useState } from "react";
import { useTranslations } from "next-intl";
import { Building2, GraduationCap, HeartPulse, Landmark, Loader2, Stamp } from "lucide-react";
import { useAccreditationGate } from "@/hooks/useAccreditationGate";
import ProtectedAction from "@/components/auth/ProtectedAction";
import { useAuth } from "@/components/auth/AuthProvider";
import { useAuthModal } from "@/context/AuthModalContext";
import { submitCabinetComplaint } from "@/app/actions";
import { toast } from "sonner";

const MINISTRIES = [
  ["وزارة الصحة", "health", HeartPulse],
  ["وزارة التربية والتعليم العالي", "education", GraduationCap],
  ["وزارة الحكم المحلي", "local", Building2],
  ["وزارة المالية", "finance", Landmark],
];

const EASE = "transition-all duration-[250ms] ease-[cubic-bezier(0.16,1,0.3,1)] motion-reduce:transition-none";

function remainingDays(due, now) {
  const end = new Date(`${due}T00:00:00`);
  return Math.ceil((end.getTime() - now) / 86400000);
}

function stepIndex(status) {
  if (status === "resolved" || status === "dismissed") return 2;
  if (status === "under_ministerial_review") return 1;
  return 0;
}

export function ComplaintsClient({ complaints = [] }) {
  const t = useTranslations("Complaints");
  const gateT = useTranslations("Common");
  const { ready, restricted } = useAccreditationGate();
  const locked = !ready || restricted;
  const guestT = useTranslations("GuestAuth");
  const { user, loading } = useAuth();
  const { openAuthModal } = useAuthModal();
  const [rows, setRows] = useState(complaints);
  const [sending, setSending] = useState(false);
  const [ministry, setMinistry] = useState("وزارة الحكم المحلي");
  const [now, setNow] = useState(null);
  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect -- one-shot hydration-safe timestamp (by design)
    setNow(Date.now());
  }, []);

  const openCount = rows.filter((row) => row.status === "submitted").length;
  const reviewCount = rows.filter((row) => row.status === "under_ministerial_review").length;
  const resolvedCount = rows.filter((row) => row.status === "resolved").length;
  const steps = [t("step_filed"), t("step_review"), t("step_final")];

  const onSubmit = async (event) => {
    event.preventDefault();
    if (sending || locked) return;
    if (loading || !user) {
      if (!loading) openAuthModal({ title: guestT("gate_title"), description: guestT("gate_description") });
      return;
    }
    setSending(true);
    const form = event.currentTarget;
    const formData = new FormData(form);
    const file = formData.get("attachment");
    if (file && typeof file === "object" && file.name) formData.set("attachmentName", file.name);
    const result = await submitCabinetComplaint(formData);
    setSending(false);
    if (result?.success) {
      toast.success(`${t("sent")} ${result.trackingCode}`);
      setRows((prev) => [
        {
          id: result.trackingCode,
          tracking_code: result.trackingCode,
          targeted_ministry: formData.get("targetedMinistry"),
          subject: formData.get("subject"),
          details: formData.get("details"),
          status: "submitted",
          sla_due_date: new Date(Date.now() + 14 * 86400000).toISOString().slice(0, 10),
          ministerial_response: null,
        },
        ...prev,
      ]);
      form.reset();
      setMinistry("وزارة الحكم المحلي");
    } else toast.error(result?.error || t("empty"));
  };

  return (
    <div className="space-y-6">
      {ready && restricted ? (
        <p className="rounded-lg border border-[color:var(--warning)]/40 bg-[color:var(--warning)]/10 px-3 py-2 text-sm font-semibold text-foreground">{gateT("civil_accreditation_required")}</p>
      ) : null}
      <div className="grid grid-cols-1 gap-3 min-[640px]:grid-cols-3">
        {[[t("open"), openCount], [t("review"), reviewCount], [t("resolved"), resolvedCount]].map(([label, count]) => (
          <article key={label} className="rounded-lg border border-emerald-700/30 bg-primary p-5 text-white">
            <p className="text-sm text-[#d97706]">{label}</p>
            <p className="text-3xl font-black tabular-nums">{count}</p>
          </article>
        ))}
      </div>
      {rows.map((row) => {
        const left = now ? remainingDays(row.sla_due_date, now) : null;
        const active = stepIndex(row.status);
        return (
          <article key={row.id} className="rounded-lg border bg-card p-5 shadow-sm border-border">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <p className="break-all font-mono font-black text-[#b45309]">{row.tracking_code}</p>
              <p className={`rounded-full px-3 py-1 text-xs font-bold ${left != null && left < 0 ? "bg-[#dc2626]/10 text-[#dc2626]" : "bg-amber-50 text-[#b45309] dark:bg-amber-950/40"}`}>
                {left == null ? "—" : left < 0 ? t("overdue") : t("sla_left", { days: left })}
              </p>
            </div>
            <h2 className="mt-3 break-words text-lg font-black text-[#1c1917] dark:text-zinc-50">{row.subject}</h2>
            <p className="mt-1 break-words text-sm text-foreground dark:text-zinc-400">{row.targeted_ministry}</p>

            <p className="mt-5 inline-flex rounded-full border border-border bg-muted px-3 py-1 text-xs font-bold text-foreground">{steps[active]}</p>
            <p className="mt-3 text-xs text-muted-foreground">{t("due")}: {row.sla_due_date}</p>
            {row.details ? <p className="mt-3 break-words text-sm leading-relaxed text-foreground dark:text-zinc-300">{row.details}</p> : null}
            {row.ministerial_response ? (
              <div className="mt-4 rounded-md border-s-4 border-emerald-600 bg-stone-50 p-6 dark:bg-stone-900/50">
                <p className="text-xs font-bold text-[#064e3b] dark:text-emerald-200">{t("response")}</p>
                <p className="mt-2 break-words text-sm leading-relaxed text-[#1c1917] dark:text-zinc-100">{row.ministerial_response}</p>
                <p className="mt-4 inline-flex items-center gap-2 text-xs font-bold text-[#b45309]">
                  <Stamp className="h-4 w-4" aria-hidden />
                  {t("seal")}
                </p>
              </div>
            ) : null}
          </article>
        );
      })}

      <form onSubmit={onSubmit} className="space-y-4 rounded-lg border bg-card p-5 shadow-sm sm:p-6 border-border">
        <fieldset>
          <legend className="text-sm font-semibold text-[#1c1917] dark:text-zinc-100">{t("ministry")}</legend>
          <input type="hidden" name="targetedMinistry" value={ministry} />
          <div className="mt-3 grid grid-cols-1 gap-2 min-[640px]:grid-cols-2 min-[1024px]:grid-cols-4">
            {MINISTRIES.map(([value, key, Icon]) => {
              const selected = ministry === value;
              return (
                <button
                  key={value}
                  type="button"
                  aria-pressed={selected}
                  onClick={() => setMinistry(value)}
                  className={`flex min-w-0 items-center gap-2 rounded-md border px-3 py-3 text-start text-sm font-bold ${selected ? "border-emerald-700 bg-emerald-800 text-white shadow-md" : "border-emerald-900/10 bg-background text-[#064e3b] hover:-translate-y-0.5 hover:shadow-md motion-reduce:hover:translate-y-0 dark:bg-zinc-950 dark:text-emerald-50"} ${EASE}`}
                >
                  <Icon className="h-4 w-4 shrink-0" aria-hidden />
                  <span className="min-w-0 break-words">{t(key)}</span>
                </button>
              );
            })}
          </div>
        </fieldset>
        <label className="block text-sm font-semibold text-[#1c1917] dark:text-zinc-100">{t("subject")}
          <input name="subject" required minLength={10} className={`mt-1 w-full rounded-md border border-emerald-900/15 bg-white/90 px-4 py-3 dark:border-white/10 dark:bg-zinc-950 ${EASE}`} />
        </label>
        <label className="block text-sm font-semibold text-[#1c1917] dark:text-zinc-100">{t("details")}
          <textarea name="details" required minLength={30} rows={4} className={`mt-1 w-full rounded-md border border-emerald-900/15 bg-white/90 px-4 py-3 dark:border-white/10 dark:bg-zinc-950 ${EASE}`} />
        </label>
        <label className="block text-sm font-semibold text-[#1c1917] dark:text-zinc-100">{t("attachment")}
          <input name="attachment" type="file" className="mt-2 block w-full max-w-full text-sm file:me-3 file:rounded-xl file:border-0 file:bg-[#064e3b] file:px-3 file:py-2 file:text-xs file:font-bold file:text-white" />
        </label>
        <ProtectedAction className="block">
          <button type="submit" disabled={locked || sending} className={`flex w-full items-center justify-center gap-2 rounded-md border border-emerald-500/30 bg-primary px-8 py-4 font-semibold text-white hover:-translate-y-0.5 disabled:opacity-60 motion-reduce:hover:translate-y-0 ${EASE}`}>
            {sending ? <Loader2 className="h-4 w-4 animate-spin motion-reduce:animate-none" /> : null}
            {t("submit")}
          </button>
        </ProtectedAction>
      </form>
    </div>
  );
}
