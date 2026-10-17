"use client";

import { useState } from "react";
import { useLocale, useTranslations } from "next-intl";
import { Link } from "@/i18n/routing";
import { FadeIn } from "@/components/animations/FadeIn";
import { Button } from "@/components/ui/button";
import { updateMedicalProfile } from "@/app/actions";
import { toast } from "sonner";
import { Droplet, Loader2, Syringe } from "lucide-react";

const BLOOD = ["A+", "A-", "B+", "B-", "AB+", "AB-", "O+", "O-"];

export function HealthRecordsClient({
  initialProfile = null,
  initialVaccines = [],
  gateError = null,
}) {
  const t = useTranslations("HealthRecords");
  const ts = useTranslations("SuperApp");
  const locale = useLocale();
  const isAr = locale === "ar";
  const [profile, setProfile] = useState(initialProfile);
  const [loading, setLoading] = useState(false);

  if (gateError) {
    return (
      <div className="flex flex-col items-center justify-center gap-4 bg-background px-4 py-16">
        <p className="max-w-lg text-center text-base font-semibold text-foreground">
          {String(gateError).includes("اعتماد") ? ts("accreditation_required") : ts("login_required")}
        </p>
        {String(gateError).includes("اعتماد") ? null : (
          <Button asChild className="rounded-full px-6 font-bold">
            <Link href="/auth/login">{ts("login_cta")}</Link>
          </Button>
        )}
      </div>
    );
  }

  const handleSave = async (e) => {
    e.preventDefault();
    setLoading(true);
    const formData = new FormData(e.currentTarget);
    const result = await updateMedicalProfile(formData);
    if (result.success) {
      toast.success(t("success"));
      setProfile(result.profile);
    } else {
      toast.error(result.error || ts("failed"));
    }
    setLoading(false);
  };

  return (
    <div className="space-y-8">
      <FadeIn>
        <h1 className="text-3xl font-black tracking-tight text-foreground sm:text-4xl">
          {t("title")}
        </h1>
        <p className="mt-2 text-muted-foreground">{t("subtitle")}</p>
      </FadeIn>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
        <FadeIn delay={0.05}>
          <div className="bg-card flex items-center gap-3 rounded-lg border border-border p-5">
            <div className="flex h-12 w-12 items-center justify-center rounded-md bg-red-500/10">
              <Droplet className="h-6 w-6 text-red-600" />
            </div>
            <div>
              <p className="text-xs font-semibold text-muted-foreground">{t("blood_type")}</p>
              <span className="mt-1 inline-flex rounded-full bg-primary/10 px-3 py-1 text-sm font-black text-primary">
                {profile?.blood_type || "—"}
              </span>
            </div>
          </div>
        </FadeIn>
        <FadeIn delay={0.08} className="sm:col-span-2">
          <div className="bg-card rounded-lg border border-border p-5">
            <p className="text-xs font-semibold text-muted-foreground">{t("allergies")}</p>
            <div className="mt-2 flex flex-wrap gap-2">
              {(profile?.allergies || []).length === 0 ? (
                <span className="text-sm text-muted-foreground">—</span>
              ) : (
                profile.allergies.map((a) => (
                  <span
                    key={a}
                    className="rounded-full bg-amber-500/10 px-3 py-1 text-xs font-bold text-amber-700 dark:text-amber-300"
                  >
                    {a}
                  </span>
                ))
              )}
            </div>
          </div>
        </FadeIn>
      </div>

      <FadeIn delay={0.1}>
        <form
          onSubmit={handleSave}
          className="bg-card space-y-4 rounded-lg border border-border p-6 sm:p-8"
        >
          <h2 className="text-lg font-bold">{t("update_profile")}</h2>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <div>
              <label className="mb-1.5 block text-sm font-semibold">{t("blood_type")}</label>
              <select
                name="bloodType"
                defaultValue={profile?.blood_type || ""}
                className="w-full rounded-xl border border-input bg-popover px-4 py-3"
              >
                <option value="">—</option>
                {BLOOD.map((b) => (
                  <option key={b} value={b}>
                    {b}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="mb-1.5 block text-sm font-semibold">
                {t("primary_center")}
              </label>
              <input
                name="primaryHealthCenter"
                required
                defaultValue={profile?.primary_health_center || ""}
                className="w-full rounded-xl border border-input bg-card px-4 py-3"
              />
            </div>
            <div>
              <label className="mb-1.5 block text-sm font-semibold">
                {t("insurance_number")}
              </label>
              <input
                name="insuranceNumber"
                defaultValue={profile?.insurance_number || ""}
                className="w-full rounded-xl border border-input bg-card px-4 py-3"
                dir="ltr"
              />
            </div>
            <div>
              <label className="mb-1.5 block text-sm font-semibold">
                {t("allergies")}{" "}
                <span className="font-normal text-muted-foreground">
                  ({t("allergies_hint")})
                </span>
              </label>
              <input
                name="allergies"
                defaultValue={(profile?.allergies || []).join(", ")}
                className="w-full rounded-xl border border-input bg-card px-4 py-3"
              />
            </div>
            <div className="sm:col-span-2">
              <label className="mb-1.5 block text-sm font-semibold">
                {t("chronic")}{" "}
                <span className="font-normal text-muted-foreground">
                  ({t("allergies_hint")})
                </span>
              </label>
              <input
                name="chronicDiseases"
                defaultValue={(profile?.chronic_diseases || []).join(", ")}
                className="w-full rounded-xl border border-input bg-card px-4 py-3"
              />
            </div>
          </div>
          <Button type="submit" disabled={loading} className="h-12 rounded-xl px-8 font-bold">
            {loading ? <Loader2 className="h-5 w-5 animate-spin" /> : ts("save")}
          </Button>
        </form>
      </FadeIn>

      <FadeIn delay={0.15}>
        <div className="bg-card relative overflow-x-auto rounded-lg border border-border p-6 sm:p-8">
          <p className="mb-3 text-xs font-semibold text-muted-foreground sm:hidden">{t("swipe_hint")}</p>
          <div className="pointer-events-none absolute inset-y-0 end-0 w-10 sm:hidden" aria-hidden />
          <h2 className="mb-4 flex items-center gap-2 text-lg font-bold">
            <Syringe className="h-5 w-5 text-primary" />
            {t("vaccines")}
          </h2>
          {initialVaccines.length === 0 ? (
            <p className="text-muted-foreground">{t("empty_vaccines")}</p>
          ) : (
            <table className="w-full min-w-[540px] text-start text-sm">
              <thead>
                <tr className="border-b border-border text-muted-foreground">
                  <th className="py-2 pe-3 font-semibold">{t("vaccine_name")}</th>
                  <th className="py-2 pe-3 font-semibold">{t("dose")}</th>
                  <th className="py-2 pe-3 font-semibold">{t("date")}</th>
                  <th className="py-2 pe-3 font-semibold">{t("facility")}</th>
                  <th className="py-2 font-semibold">{t("batch")}</th>
                </tr>
              </thead>
              <tbody>
                {initialVaccines.map((v) => (
                  <tr key={v.id} className="border-b border-border/60">
                    <td className="py-3 pe-3 font-medium">
                      {isAr ? v.vaccine_name_ar : v.vaccine_name_en}
                    </td>
                    <td className="py-3 pe-3">{v.dose_number}</td>
                    <td className="py-3 pe-3">{v.administered_date}</td>
                    <td className="py-3 pe-3">{v.health_facility}</td>
                    <td className="py-3 font-mono text-xs" dir="ltr">
                      {v.batch_number}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      </FadeIn>
    </div>
  );
}
