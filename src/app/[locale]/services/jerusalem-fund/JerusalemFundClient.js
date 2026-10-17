"use client";

import { useState } from "react";
import { useTranslations } from "next-intl";
import { Loader2, Scale, Home, Store } from "lucide-react";
import { TatreezDivider } from "@/components/ui/TatreezDivider";
import { useAccreditationGate } from "@/hooks/useAccreditationGate";
import ProtectedAction from "@/components/auth/ProtectedAction";
import { useAuth } from "@/components/auth/AuthProvider";
import { useAuthModal } from "@/context/AuthModalContext";
import { submitJerusalemResilienceCase } from "@/app/actions";
import { toast } from "sonner";

const TRACKS = [
  ["legal_eviction_defense", "legal", Scale],
  ["arnona_relief", "arnona", Store],
  ["building_renovation", "renovation", Home],
];
const EASE = "transition-all duration-[250ms] ease-[cubic-bezier(0.16,1,0.3,1)] motion-reduce:transition-none";

function Skyline() {
  return (
    <svg viewBox="0 0 640 120" className="pointer-events-none absolute inset-x-0 bottom-0 h-24 w-full opacity-30" aria-hidden>
      <path fill="#022c22" d="M0 120V78h40l18-28 18 28h36l8-16 8 16h28V52h16v26h24l22-40 22 40h30V40h14v38h26l12-22 12 22h40V64h18v14h70l16-30 16 30h48V70h20v8h90V120H0z" />
      <circle cx="318" cy="46" r="14" fill="#064e3b" />
      <path d="M318 28v10M304 46h10M322 46h10M318 50v12" stroke="#d97706" strokeWidth="1.4" />
    </svg>
  );
}

export function JerusalemFundClient({ cases = [] }) {
  const t = useTranslations("JerusalemFund");
  const gateT = useTranslations("Common");
  const { ready, restricted } = useAccreditationGate();
  const locked = !ready || restricted;
  const guestT = useTranslations("GuestAuth");
  const { user, loading } = useAuth();
  const { openAuthModal } = useAuthModal();
  const [rows, setRows] = useState(cases);
  const [track, setTrack] = useState("arnona_relief");
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
    const result = await submitJerusalemResilienceCase(new FormData(form));
    setSending(false);
    if (result?.success) {
      toast.success(`${t("sent")} ${result.caseId}`);
      const data = new FormData(form);
      setRows((prev) => [
        {
          id: result.caseId,
          case_id: result.caseId,
          support_type: data.get("supportType"),
          property_address: data.get("propertyAddress"),
          details: data.get("details"),
          status: "pending_review",
        },
        ...prev,
      ]);
      form.reset();
      setTrack("arnona_relief");
    } else toast.error(result?.error || t("empty"));
  };

  return (
    <div className="space-y-6">
      {ready && restricted ? (
        <p className="rounded-lg border border-[color:var(--warning)]/40 bg-[color:var(--warning)]/10 px-3 py-2 text-sm font-semibold text-foreground">{gateT("civil_accreditation_required")}</p>
      ) : null}
      <div className="grid grid-cols-1 gap-3 min-[768px]:grid-cols-3">
        {TRACKS.map(([value, label, Icon]) => (
          <article key={value} className="rounded-lg border border-amber-600/25 bg-card p-4">
            <Icon className="h-5 w-5 text-[#b45309]" aria-hidden />
            <p className="mt-2 text-sm font-bold text-[#064e3b] dark:text-emerald-50">{t(label)}</p>
          </article>
        ))}
      </div>
      {rows.length === 0 ? <p className="text-center text-foreground">{t("empty")}</p> : rows.map((row) => (
        <article key={row.id} className="rounded-lg border bg-card p-5 border-border">
          <p className="break-all font-mono font-black text-[#b45309]">{row.case_id}</p>
          <h2 className="mt-1 font-black text-[#064e3b] dark:text-emerald-50">{t(row.support_type)}</h2>
          <p className="mt-1 text-sm font-semibold">{row.property_address}</p>
          <p className="mt-2 break-words text-sm text-foreground dark:text-zinc-300">{row.details}</p>
          <p className="mt-3 inline-flex rounded-full bg-emerald-800/10 px-3 py-1 text-xs font-bold text-[#064e3b] dark:text-emerald-100">{t(row.status)}</p>
        </article>
      ))}
      <form onSubmit={onSubmit} className="space-y-4 rounded-lg border bg-card p-5 border-border">
        <fieldset>
          <legend className="text-sm font-semibold">{t("track")}</legend>
          <input type="hidden" name="supportType" value={track} />
          <div className="mt-3 grid grid-cols-1 gap-2 min-[640px]:grid-cols-3">
            {TRACKS.map(([value, label, Icon]) => (
              <button
                key={value}
                type="button"
                aria-pressed={track === value}
                onClick={() => setTrack(value)}
                className={`flex min-w-0 items-center gap-2 rounded-md border px-3 py-3 text-start text-sm font-bold ${track === value ? "border-emerald-700 bg-emerald-800 text-white" : "border-emerald-900/10 bg-background text-[#064e3b] dark:bg-zinc-950 dark:text-emerald-50"} ${EASE}`}
              >
                <Icon className="h-4 w-4 shrink-0" aria-hidden />
                <span className="min-w-0 break-words">{t(label)}</span>
              </button>
            ))}
          </div>
        </fieldset>
        <label className="block text-sm font-semibold">{t("address")}
          <input name="propertyAddress" required minLength={8} className={`mt-1 w-full rounded-md border border-emerald-900/15 bg-white/90 px-4 py-3 dark:bg-zinc-950 ${EASE}`} />
        </label>
        <label className="block text-sm font-semibold">{t("details")}
          <textarea name="details" required minLength={30} rows={4} className={`mt-1 w-full rounded-md border border-emerald-900/15 bg-white/90 px-4 py-3 dark:bg-zinc-950 ${EASE}`} />
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
