"use client";

import { useState } from "react";
import { useLocale, useTranslations } from "next-intl";
import { Link } from "@/i18n/routing";
import { FadeIn } from "@/components/animations/FadeIn";
import { EagleWatermark } from "@/components/brand/BrandMark";
import { Button } from "@/components/ui/button";
import { IdCard, Car, HeartPulse, BookOpen } from "lucide-react";

const DOC_ICONS = {
  driving_license: IdCard,
  vehicle_registration: Car,
  health_insurance: HeartPulse,
  family_book: BookOpen,
};

function DocFlipCard({ doc, locale, t }) {
  const [flipped, setFlipped] = useState(false);
  const Icon = DOC_ICONS[doc.doc_type] || IdCard;
  const title = locale === "ar" ? doc.title_ar : doc.title_en;
  const typeKeys = {
    driving_license: true,
    vehicle_registration: true,
    health_insurance: true,
    family_book: true,
  };
  const typeLabel = typeKeys[doc.doc_type] ? t(doc.doc_type) : doc.doc_type;

  return (
    <button
      type="button"
      onClick={() => setFlipped((v) => !v)}
      className="group relative h-56 w-full cursor-pointer text-left rtl:text-right [perspective:1200px]"
      aria-label={t("flip_hint")}
    >
      <div
        className={`relative h-full w-full transition-transform duration-500 [transform-style:preserve-3d] ${
          flipped ? "[transform:rotateY(180deg)]" : ""
        }`}
      >
        <div className="absolute inset-0 overflow-hidden rounded-lg border border-border bg-card p-5 text-foreground [backface-visibility:hidden]">
          <EagleWatermark opacity={0.12} />
          <div className="relative z-10 flex h-full flex-col">
            <div className="flex items-start justify-between gap-3">
              <div className="flex items-center gap-2">
                <div className="flex h-10 w-10 items-center justify-center rounded-sm border border-border bg-muted">
                  <Icon className="h-5 w-5 text-foreground" />
                </div>
                <div className="min-w-0">
                  <p className="text-[10px] font-bold tracking-widest text-muted-foreground">
                    {typeLabel}
                  </p>
                  <p className="truncate text-sm font-bold">{title}</p>
                </div>
              </div>
              <span className="shrink-0 rounded-sm border border-[color:var(--brand-700)]/30 bg-[color:var(--brand-700)]/10 px-2.5 py-1 text-[10px] font-bold text-foreground">
                {t(doc.status) || doc.status}
              </span>
            </div>
            <div className="mt-auto">
              <p className="font-mono text-xs tracking-widest text-muted-foreground" dir="ltr">
                {t("doc_number")}: {doc.doc_number}
              </p>
              <div
                className="mt-3 h-8 w-full overflow-hidden rounded-md bg-white"
                aria-hidden
              >
                <div
                  className="h-full w-full"
                  style={{
                    backgroundImage:
                      "repeating-linear-gradient(90deg,#0f172a 0 2px,transparent 2px 4px,#0f172a 4px 5px,transparent 5px 8px,#0f172a 8px 11px,transparent 11px 13px)",
                  }}
                />
              </div>
            </div>
          </div>
        </div>

        <div className="absolute inset-0 overflow-hidden rounded-lg border border-border bg-card p-5 text-card-foreground [backface-visibility:hidden] [transform:rotateY(180deg)]">
          <EagleWatermark opacity={0.06} />
          <div className="relative z-10 flex h-full flex-col gap-3 text-sm">
            <p className="font-bold text-foreground">{title}</p>
            <p className="text-muted-foreground">
              {t("issue")}: {doc.issue_date}
            </p>
            <p className="text-muted-foreground">
              {t("expiry")}: {doc.expiry_date}
            </p>
            <p className="mt-auto font-mono text-xs text-foreground" dir="ltr">
              {doc.doc_number}
            </p>
          </div>
        </div>
      </div>
    </button>
  );
}

export function DocumentsClient({ initialDocuments = [], gateError = null }) {
  const t = useTranslations("Documents");
  const ts = useTranslations("SuperApp");
  const locale = useLocale();

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
    <div className="overflow-x-clip bg-background py-12 px-4 sm:px-6 lg:px-8">
      <div className="mx-auto max-w-5xl space-y-8">
        <FadeIn>
          <h1 className="text-3xl font-black tracking-tight text-foreground sm:text-4xl">
            {t("title")}
          </h1>
          <p className="mt-2 max-w-2xl text-muted-foreground">{t("subtitle")}</p>
        </FadeIn>

        {initialDocuments.length === 0 ? (
          <FadeIn delay={0.05}>
            <div className="rounded-lg border border-dashed border-border bg-card p-12 text-center">
              <p className="font-medium text-muted-foreground">{t("empty")}</p>
            </div>
          </FadeIn>
        ) : (
          <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-3">
            {initialDocuments.map((doc, i) => (
              <FadeIn key={doc.id} delay={0.05 * (i + 1)}>
                <DocFlipCard doc={doc} locale={locale} t={t} />
              </FadeIn>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
