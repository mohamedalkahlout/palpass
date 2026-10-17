"use client";

import { useLocale, useTranslations } from "next-intl";
import { Link } from "@/i18n/routing";
import { FadeIn } from "@/components/animations/FadeIn";
import { EagleWatermark, OfficialCrest } from "@/components/brand/BrandMark";
import { Button } from "@/components/ui/button";
import { Store } from "lucide-react";

const INSPECTION = {
  compliant: "compliant",
  inspection_due: "inspection_due",
  violation_issued: "violation_issued",
};

export function LicensesClient({ initialLicenses = [], gateError = null }) {
  const t = useTranslations("TradeLicenses");
  const ts = useTranslations("SuperApp");
  const locale = useLocale();
  const isAr = locale === "ar";

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

  return (
    <div className="space-y-8">
      <FadeIn>
        <h1 className="text-3xl font-black tracking-tight text-foreground sm:text-4xl">
          {t("title")}
        </h1>
        <p className="mt-2 text-muted-foreground">{t("subtitle")}</p>
      </FadeIn>

      {initialLicenses.length === 0 ? (
        <FadeIn delay={0.05}>
          <div className="bg-card rounded-lg border border-dashed border-border p-12 text-center text-muted-foreground">
            {t("empty")}
          </div>
        </FadeIn>
      ) : (
        <div className="grid grid-cols-1 gap-5 md:grid-cols-2">
          {initialLicenses.map((lic, i) => (
            <FadeIn key={lic.id} delay={0.05 * (i + 1)}>
              <article className="relative overflow-hidden rounded-lg border border-[color:var(--gold)]/35 bg-card p-6 shadow-sm">
                <EagleWatermark opacity={0.06} />
                <div className="relative z-10 space-y-3">
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex items-center gap-2">
                      <div className="flex h-10 w-10 items-center justify-center rounded-md bg-primary/10">
                        <Store className="h-5 w-5 text-primary" />
                      </div>
                      <div>
                        <p className="font-bold text-foreground">
                          {isAr ? lic.business_name_ar : lic.business_name_en}
                        </p>
                        <p className="font-mono text-xs text-muted-foreground" dir="ltr">
                          {t("license_number")}: {lic.license_number}
                        </p>
                      </div>
                    </div>
                    <OfficialCrest size={32} className="opacity-70" />
                  </div>
                  <p className="text-sm text-muted-foreground">
                    {t("activity")}: {lic.activity_type}
                  </p>
                  <p className="text-sm text-muted-foreground">
                    {t("governorate")}: {lic.governorate}
                  </p>
                  <div className="flex flex-wrap items-center gap-2 pt-2">
                    <span
                      className={`rounded-full px-3 py-1 text-[10px] font-bold ${
                        lic.inspection_status === "compliant"
                          ? "bg-emerald-500/15 text-emerald-700 dark:text-emerald-300"
                          : lic.inspection_status === "violation_issued"
                            ? "bg-red-500/15 text-red-700 dark:text-red-300"
                            : "bg-amber-500/15 text-amber-700 dark:text-amber-300"
                      }`}
                    >
                      {t("inspection")}:{" "}
                      {t(INSPECTION[lic.inspection_status] || "compliant")}
                    </span>
                    <span className="rounded-full bg-muted px-3 py-1 text-[10px] font-bold text-foreground">
                      {t("expires")}: {lic.expires_at}
                    </span>
                  </div>
                </div>
              </article>
            </FadeIn>
          ))}
        </div>
      )}
    </div>
  );
}
