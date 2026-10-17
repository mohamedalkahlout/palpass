"use client";

import { useLocale, useTranslations } from "next-intl";
import { Link } from "@/i18n/routing";
import { FadeIn } from "@/components/animations/FadeIn";
import { EagleWatermark, OfficialCrest } from "@/components/brand/BrandMark";
import { Button } from "@/components/ui/button";
import { QRCodeSVG } from "qrcode.react";

const STATUS_MAP = {
  eligible: "eligible",
  disbursed: "disbursed",
  under_review: "under_review",
};

export function AidRationClient({ initialCard = null, gateError = null }) {
  const t = useTranslations("AidRation");
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
    <div className="space-y-6">
      <FadeIn>
        <h1 className="text-3xl font-black tracking-tight text-foreground">{t("title")}</h1>
        <p className="mt-2 text-muted-foreground">{t("subtitle")}</p>
      </FadeIn>

      {!initialCard ? (
        <FadeIn delay={0.05}>
          <div className="bg-card rounded-lg border border-dashed border-border p-12 text-center text-muted-foreground">
            {t("empty")}
          </div>
        </FadeIn>
      ) : (
        <FadeIn delay={0.05}>
          <article className="relative overflow-hidden rounded-lg border border-[color:var(--gold)]/40 bg-primary p-6 text-white">
            <EagleWatermark opacity={0.14} />
            <div className="relative z-10 space-y-5">
              <header className="flex items-center justify-between">
                <OfficialCrest size={48} />
                <span className="rounded-full bg-[color:var(--gold)]/20 px-3 py-1 text-xs font-bold text-[color:var(--gold)]">
                  {t(STATUS_MAP[initialCard.ration_status] || "eligible")}
                </span>
              </header>

              <div>
                <p className="text-[10px] font-bold uppercase tracking-widest text-white/55">
                  {t("card_number")}
                </p>
                <p className="mt-1 font-mono text-lg font-black tracking-wider" dir="ltr">
                  {initialCard.card_number}
                </p>
              </div>

              <div className="grid grid-cols-2 gap-4 text-sm">
                <div>
                  <p className="text-white/55">{t("household")}</p>
                  <p className="font-bold">{initialCard.household_size}</p>
                </div>
                <div>
                  <p className="text-white/55">{t("cycle")}</p>
                  <p className="font-bold">{initialCard.next_distribution_cycle}</p>
                </div>
                <div className="col-span-2">
                  <p className="text-white/55">{t("center")}</p>
                  <p className="font-bold">
                    {isAr
                      ? initialCard.center_location_ar
                      : initialCard.center_location_en}
                  </p>
                </div>
                <div className="col-span-2">
                  <p className="text-sm leading-relaxed text-white/80">{t("basket")}</p>
                </div>
              </div>

              <div className="flex flex-col items-center gap-3 rounded-md bg-white p-4 text-zinc-900">
                <QRCodeSVG value={initialCard.qr_hash} size={120} level="M" />
                <p className="break-all text-center font-mono text-[10px] text-zinc-600" dir="ltr">
                  {t("qr_hash")}: {initialCard.qr_hash}
                </p>
              </div>
            </div>
          </article>
        </FadeIn>
      )}
    </div>
  );
}
