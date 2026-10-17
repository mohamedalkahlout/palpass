"use client";

import { useState } from "react";
import { useTranslations } from "next-intl";
import { Loader2 } from "lucide-react";
import { EagleWatermark, OfficialCrest } from "@/components/brand/BrandMark";
import { TatreezDivider } from "@/components/ui/TatreezDivider";
import { SovereignConfirmModal } from "@/components/ui/SovereignConfirmModal";
import { useAccreditationGate } from "@/hooks/useAccreditationGate";
import ProtectedAction from "@/components/auth/ProtectedAction";
import { renewDrivingLicense, renewVehicleRegistration } from "@/app/actions";
import { notifyWalletUpdated } from "@/lib/wallet-events";
import { toast } from "sonner";

const EASE = "transition-all duration-[250ms] ease-[cubic-bezier(0.16,1,0.3,1)] motion-reduce:transition-none";

function money(value) {
  return `${Number(value || 0).toLocaleString("en-GB", { minimumFractionDigits: 2, maximumFractionDigits: 2 })} ILS`;
}

export function DrivingLicenseClient({ license, vehicles = [], signedIn = false }) {
  const t = useTranslations("DrivingLicense");
  const gateT = useTranslations("Common");
  const { ready, restricted } = useAccreditationGate();
  const locked = !ready || restricted;
  const [pending, setPending] = useState(null);
  const [sending, setSending] = useState(false);

  const confirm = async () => {
    if (!pending || sending || locked) return;
    setSending(true);
    const result = pending.kind === "license"
      ? await renewDrivingLicense(pending.id)
      : await renewVehicleRegistration(pending.id);
    setSending(false);
    if (!result.success) {
      toast.error(result.error);
      return;
    }
    if (result.newBalance != null) notifyWalletUpdated(result.newBalance);
    toast.success(t("renewed"));
    setPending(null);
    window.location.reload();
  };

  return (
    <div className="space-y-6">
      {ready && restricted ? (
        <p className="rounded-lg border border-[color:var(--warning)]/40 bg-[color:var(--warning)]/10 px-3 py-2 text-sm font-semibold text-foreground">{gateT("civil_accreditation_required")}</p>
      ) : null}

      {!signedIn ? <p className="text-center text-sm text-foreground">{t("sign_in")}</p> : null}

      {signedIn && !license ? <p className="text-center text-sm text-foreground">{t("empty_license")}</p> : null}

      {license ? (
        <article className="relative overflow-hidden rounded-lg border-2 border-amber-600/30 bg-primary p-6 text-white sm:p-8">
          <EagleWatermark className="opacity-10" opacity={1} />
          <div className="relative grid gap-6 sm:grid-cols-[auto_1fr]">
            <div className="flex h-24 w-20 items-center justify-center rounded-md border border-[#b45309]/50 bg-emerald-950/60">
              <OfficialCrest size={48} />
            </div>
            <div className="min-w-0">
              <div className="mb-3 flex flex-wrap items-center justify-between gap-3">
                <span className="inline-block h-8 w-12 rounded-md bg-primary shadow-inner" aria-hidden />
                <span className="rounded-full border border-[#b45309]/50 px-3 py-1 text-xs font-black text-[#f5d78e]">{t(`class_${license.license_class}`)}</span>
              </div>
              <p className="font-mono text-sm tracking-wide" dir="ltr">{license.license_number}</p>
              <dl className="mt-4 grid grid-cols-2 gap-3 text-sm">
                <div><dt className="text-emerald-100/70">{t("blood")}</dt><dd className="font-bold" dir="ltr">{license.blood_type}</dd></div>
                <div><dt className="text-emerald-100/70">{t("issued")}</dt><dd className="font-bold" dir="ltr">{license.issue_date}</dd></div>
                <div><dt className="text-emerald-100/70">{t("expires")}</dt><dd className="font-bold" dir="ltr">{license.expiry_date}</dd></div>
                <div><dt className="text-emerald-100/70">{t("status")}</dt><dd className="font-bold">{t(license.status)}</dd></div>
              </dl>
              <p className="mt-3 text-xs text-emerald-100/80">{license.restrictions}</p>
              <div className="mt-4">
                <div className="mb-1 flex justify-between text-xs font-bold">
                  <span>{t("points")}</span>
                  <span dir="ltr">{license.demerit_points}/12</span>
                </div>
                <div className="h-2 overflow-hidden rounded-full bg-emerald-950">
                  <div className="h-full bg-[#b45309]" style={{ width: `${Math.min(100, (Number(license.demerit_points) / 12) * 100)}%` }} />
                </div>
              </div>
            </div>
          </div>
          <ProtectedAction className="relative mt-6 block" onAction={() => { if (!locked && !sending) setPending({ kind: "license", id: license.id }); }}>
            <button type="button" disabled={locked || sending} className={`flex w-full items-center justify-center gap-2 rounded-md bg-white px-4 py-3 text-sm font-bold text-[#064e3b] disabled:opacity-60 ${EASE}`}>
              {sending && pending?.kind === "license" ? <Loader2 className="h-4 w-4 animate-spin motion-reduce:animate-none" /> : null}
              {t("renew_license")}
            </button>
          </ProtectedAction>
        </article>
      ) : null}

      <section className="space-y-3">
        <h2 className="text-xl font-black text-[#064e3b] dark:text-emerald-50">{t("vehicles")}</h2>
        {signedIn && vehicles.length === 0 ? <p className="text-sm text-foreground">{t("empty_vehicles")}</p> : null}
        {vehicles.map((vehicle) => (
          <article key={vehicle.id} className="rounded-lg border border-[#e7e5e4] bg-white/90 p-5 dark:border-zinc-700 dark:bg-zinc-900/85">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <p className="rounded-xl border-2 border-[#1c1917] bg-background px-4 py-2 font-mono text-xl font-black tracking-widest text-[#1c1917]" dir="ltr">{vehicle.plate_number}</p>
              <span className={`rounded-full px-3 py-1 text-xs font-bold ${vehicle.insurance_status === "valid" ? "bg-emerald-800/10 text-[#064e3b]" : "border border-amber-500/40 bg-amber-500/10 text-amber-800"}`}>
                {t(`insurance_${vehicle.insurance_status}`)}
              </span>
            </div>
            <h3 className="mt-3 text-lg font-black text-[#1c1917] dark:text-zinc-50">{vehicle.make_model}</h3>
            <p className="text-sm text-muted-foreground" dir="ltr">{vehicle.model_year} · {vehicle.vin_chassis}</p>
            <p className="mt-1 text-sm text-foreground">{t("expires")}: <span dir="ltr">{vehicle.license_expiry}</span></p>
            <ProtectedAction className="mt-4 block" onAction={() => { if (!locked && !sending) setPending({ kind: "vehicle", id: vehicle.id, fee: vehicle.annual_license_fee }); }}>
              <button type="button" disabled={locked || sending} className={`flex w-full items-center justify-center gap-2 rounded-md bg-[#064e3b] px-4 py-3 text-sm font-bold text-white disabled:opacity-60 ${EASE}`}>
                {sending && pending?.id === vehicle.id ? <Loader2 className="h-4 w-4 animate-spin motion-reduce:animate-none" /> : null}
                {t("renew_vehicle")}
              </button>
            </ProtectedAction>
          </article>
        ))}
      </section>
    </div>
  );
}
