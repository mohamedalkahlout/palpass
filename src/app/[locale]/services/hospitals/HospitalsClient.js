"use client";

import { useState } from "react";
import { useLocale, useTranslations } from "next-intl";
import { Loader2, Phone } from "lucide-react";
import { EagleWatermark, OfficialCrest } from "@/components/brand/BrandMark";
import { TatreezDivider } from "@/components/ui/TatreezDivider";
import { useAccreditationGate } from "@/hooks/useAccreditationGate";
import ProtectedAction from "@/components/auth/ProtectedAction";
import { useAuth } from "@/components/auth/AuthProvider";
import { useAuthModal } from "@/context/AuthModalContext";
import { bookHospitalClinicAppointment } from "@/app/actions";
import { Link } from "@/i18n/routing";
import { toast } from "sonner";

const GOVERNORATES = ["all", "jerusalem", "gaza", "ramallah", "nablus", "hebron", "khan_yunis", "north_gaza", "bethlehem", "jenin", "deir_al_balah"];
const EASE = "transition-all duration-[250ms] ease-[cubic-bezier(0.16,1,0.3,1)] motion-reduce:transition-none";

function telHref(phone) {
  return `tel:${String(phone || "").replace(/[^\d+]/g, "")}`;
}

export function HospitalsClient({ hospitals = [], governorate = "all" }) {
  const t = useTranslations("Hospitals");
  const gateT = useTranslations("Common");
  const guestT = useTranslations("GuestAuth");
  const locale = useLocale();
  const { user, loading } = useAuth();
  const { openAuthModal } = useAuthModal();
  const { ready, restricted } = useAccreditationGate();
  const locked = !ready || restricted;
  const [sendingId, setSendingId] = useState(null);

  const onBook = async (event, hospitalId) => {
    event.preventDefault();
    if (sendingId || locked) return;
    if (loading || !user) {
      openAuthModal({ title: guestT("gate_title"), description: guestT("gate_description") });
      return;
    }
    setSendingId(hospitalId);
    const result = await bookHospitalClinicAppointment(new FormData(event.currentTarget));
    setSendingId(null);
    if (!result.success) {
      toast.error(result.error);
      return;
    }
    toast.success(`${t("booked")} ${result.referralCode}`);
    event.currentTarget.reset();
  };

  return (
    <div className="space-y-6">
      <p className="rounded-lg border border-[color:var(--warning)]/40 bg-[color:var(--warning)]/10 px-4 py-3 text-sm font-semibold text-foreground">{t("dispatch")}</p>
      {ready && restricted ? (
        <p className="inline-flex rounded-full border border-amber-500/40 bg-amber-500/10 px-3 py-1 text-xs font-bold text-amber-800 dark:text-amber-200">{gateT("civil_accreditation_required")}</p>
      ) : null}

      <div className="flex gap-2 overflow-x-auto pb-1">
        {GOVERNORATES.map((key) => (
          <Link
            key={key}
            href={key === "all" ? "/services/hospitals" : `/services/hospitals?governorate=${key}`}
            className={`shrink-0 rounded-full px-3 py-1.5 text-xs font-bold ${governorate === key ? "bg-[#064e3b] text-white" : "border border-[#e7e5e4] bg-white text-foreground dark:border-zinc-700 dark:bg-zinc-900"} ${EASE}`}
          >
            {t(key)}
          </Link>
        ))}
      </div>

      {hospitals.length === 0 ? <p className="text-center text-foreground">{t("empty")}</p> : null}

      <div className="grid gap-4">
        {hospitals.map((hospital) => {
          const departments = Array.isArray(hospital.departments) ? hospital.departments : [];
          const name = locale === "ar" ? hospital.name_ar : hospital.name_en;
          const emergency = hospital.emergency_status === "diverting_critical"
            ? "bg-[#dc2626]/10 text-[#dc2626]"
            : hospital.emergency_status === "high_capacity"
              ? "border border-amber-500/40 bg-amber-500/10 text-amber-800"
              : "bg-emerald-800/10 text-[#064e3b] dark:text-emerald-100";
          return (
            <article key={hospital.id} className="rounded-lg border border-[#e7e5e4] bg-white/90 p-5 shadow-sm dark:border-zinc-700 dark:bg-zinc-900/85">
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div className="min-w-0">
                  <p className="text-xs font-bold text-[#b45309]">{t(hospital.sector)}</p>
                  <h2 className="mt-1 text-xl font-black text-[#1c1917] dark:text-zinc-50">{name}</h2>
                  <p className="text-sm text-muted-foreground">{hospital.address}</p>
                </div>
                <span className={`inline-flex items-center gap-2 rounded-full px-3 py-1 text-xs font-bold ${emergency}`}>
                  <span className={`h-2 w-2 rounded-full ${hospital.emergency_status === "diverting_critical" ? "bg-[#dc2626]" : "bg-emerald-500 motion-safe:animate-pulse"}`} />
                  {t(hospital.emergency_status)}
                </span>
              </div>
              <div className="mt-3 flex flex-wrap gap-2">
                {departments.map((item) => (
                  <span key={item.ar || item} className="rounded-full border border-[#b45309]/30 px-2 py-1 text-xs font-semibold text-[#b45309]">
                    {locale === "ar" ? item.ar || item : item.en || item.ar || item}
                  </span>
                ))}
              </div>
              <p className="mt-3 text-sm text-foreground">{t("beds")}: {hospital.total_bed_capacity}</p>
              <a href={telHref(hospital.phone)} className={`mt-3 inline-flex items-center gap-2 rounded-md border border-[#064e3b]/30 px-4 py-2 text-sm font-bold text-[#064e3b] dark:text-emerald-100 ${EASE}`}>
                <Phone className="h-4 w-4" />
                {t("call")} · <span dir="ltr">{hospital.phone}</span>
              </a>
              <form className="mt-4 grid gap-3 sm:grid-cols-2" onSubmit={(event) => onBook(event, hospital.id)}>
                <input type="hidden" name="hospitalId" value={hospital.id} />
                <label className="text-xs font-bold text-foreground sm:col-span-2">
                  {t("clinic")}
                  <select name="clinic" className="mt-1 w-full rounded-md border border-emerald-900/15 bg-white px-3 py-2 text-sm dark:bg-zinc-950" required>
                    {departments.map((item) => (
                      <option key={item.ar || item} value={locale === "ar" ? item.ar : item.en || item.ar}>{locale === "ar" ? item.ar : item.en || item.ar}</option>
                    ))}
                  </select>
                </label>
                <label className="text-xs font-bold text-foreground">
                  {t("date")}
                  <input type="date" name="appointmentDate" required className="mt-1 w-full rounded-md border border-emerald-900/15 bg-white px-3 py-2 text-sm dark:bg-zinc-950" />
                </label>
                <label className="text-xs font-bold text-foreground">
                  {t("time")}
                  <input type="time" name="timeSlot" required className="mt-1 w-full rounded-md border border-emerald-900/15 bg-white px-3 py-2 text-sm dark:bg-zinc-950" />
                </label>
                <ProtectedAction className="sm:col-span-2" onAction={() => {}}>
                  <button type="submit" disabled={locked || sendingId === hospital.id} className={`flex w-full items-center justify-center gap-2 rounded-md bg-[#064e3b] px-4 py-3 text-sm font-bold text-white disabled:opacity-60 ${EASE}`}>
                    {sendingId === hospital.id ? <Loader2 className="h-4 w-4 animate-spin motion-reduce:animate-none" /> : null}
                    {t("book")}
                  </button>
                </ProtectedAction>
              </form>
            </article>
          );
        })}
      </div>
    </div>
  );
}
