"use client";

import { useTranslations } from "next-intl";
import { Button } from "@/components/ui/button";
import { FadeIn } from "@/components/animations/FadeIn";
import { ArrowLeft, ArrowRight, Search, ShieldCheck } from "lucide-react";
import Image from "next/image";
import { Link } from "@/i18n/routing";
import { EagleWatermark, OfficialCrest } from "@/components/brand/BrandMark";
import { ModernTatreezAccent } from "@/components/ui/ModernTatreezAccent";

export function HeroSection({ locale }) {
  const t = useTranslations("Hero");
  const isRtl = locale === "ar";

  return (
    <section className="relative overflow-hidden bg-background pt-14 pb-16 sm:pt-18 sm:pb-20">
      {/* Decorative Tatreez corner accents */}
      <div className="absolute top-4 start-4 z-10 pointer-events-none">
        <ModernTatreezAccent variant="corner" className="w-8 h-8 opacity-20 dark:opacity-10" />
      </div>
      <div className="absolute top-4 end-4 z-10 pointer-events-none rotate-90">
        <ModernTatreezAccent variant="corner" className="w-8 h-8 opacity-20 dark:opacity-10" />
      </div>

      {/* Authentic Palestinian Human Warmth & Community Backdrop Ambience Layer */}
      <div
        className="pointer-events-none absolute inset-0 z-0 overflow-hidden"
        style={{
          maskImage: "radial-gradient(ellipse at center, rgba(0,0,0,0.85) 30%, transparent 85%)",
          WebkitMaskImage: "radial-gradient(ellipse at center, rgba(0,0,0,0.85) 30%, transparent 85%)",
        }}
        aria-hidden="true"
      >
        <Image
          src="/images/civic/hero-people.webp"
          alt="صمود ودفء المجتمع الفلسطيني — PALPASS"
          fill
          priority
          sizes="100vw"
          className="absolute inset-0 w-full h-full object-cover pointer-events-none opacity-15 dark:opacity-10"
        />
        <div className="absolute inset-0 bg-gradient-to-b from-background/95 via-background/60 to-transparent dark:from-background/95 dark:via-background/70 dark:to-transparent backdrop-blur-[0.5px]" />
      </div>

      <svg aria-hidden className="absolute inset-x-0 bottom-0 z-0 h-40 w-full text-primary/15" viewBox="0 0 1440 160" preserveAspectRatio="none">
        <path fill="currentColor" d="M0 120 L180 80 L320 110 L480 50 L640 96 L820 40 L980 88 L1160 46 L1440 100 L1440 160 L0 160 Z" />
        <path fill="currentColor" fillOpacity="0.25" d="M0 140 L220 108 L400 132 L620 90 L860 128 L1100 96 L1440 130 L1440 160 L0 160 Z" />
      </svg>
      <EagleWatermark opacity={isRtl ? 0.08 : 0.06} />

      <div className="relative z-10 mx-auto max-w-7xl px-4 text-center sm:px-6 lg:px-8">
        <FadeIn delay={0.1}>
          <div className="mb-6 inline-flex items-center gap-2.5 rounded-full border border-border/80 backdrop-blur-md bg-background/70 px-4 py-1.5 text-xs sm:text-sm font-semibold text-foreground shadow-xs">
            <OfficialCrest size={20} />
            <span className="text-primary">{t("badge")}</span>
          </div>
        </FadeIn>

        <FadeIn delay={0.2}>
          <h1 className="mx-auto mb-3 max-w-4xl text-3xl font-bold leading-tight tracking-tight text-foreground sm:text-4xl lg:text-5xl">
            {t("title")}
          </h1>
          {/* Modern Tatreez Geometric Accent (Subtle & Clean) beneath institutional title */}
          <div className="my-3 flex justify-center">
            <ModernTatreezAccent variant="ribbon" className="max-w-md h-1.5 sm:h-2 opacity-15 dark:opacity-10" />
          </div>
        </FadeIn>

        <FadeIn delay={0.3}>
          <p className="mx-auto mb-8 max-w-2xl text-base leading-relaxed font-medium text-muted-foreground sm:text-lg">
            {t("subtitle")}
          </p>
        </FadeIn>

        <FadeIn delay={0.4}>
          <div className="flex flex-col sm:flex-row items-center justify-center gap-3 backdrop-blur-md bg-background/70 border border-border/60 p-2 sm:p-2.5 rounded-2xl sm:rounded-full max-w-xl mx-auto shadow-xs">
            <Button asChild size="lg" className="w-full sm:w-auto rounded-xl sm:rounded-full px-7 h-12 text-sm font-semibold shadow-sm">
              <Link href="/auth/register">
                {t("cta_primary")}
                {isRtl ? <ArrowLeft className="ms-2 h-4 w-4" /> : <ArrowRight className="ms-2 h-4 w-4" />}
              </Link>
            </Button>
            <Button asChild size="lg" variant="outline" className="w-full sm:w-auto rounded-xl sm:rounded-full px-6 h-12 text-sm font-medium bg-card text-card-foreground border-border hover:bg-muted">
              <Link href="/auth/login">
                {isRtl ? "تسجيل الدخول" : "Sign In"}
              </Link>
            </Button>
            <Button asChild size="lg" variant="ghost" className="w-full sm:w-auto rounded-xl sm:rounded-full px-5 h-12 text-sm font-medium text-muted-foreground hover:text-foreground">
              <Link href="#civic-search" className="inline-flex items-center gap-1.5">
                <Search className="h-4 w-4 text-primary" />
                <span>{isRtl ? "البحث في الخدمات" : "Search Services"}</span>
              </Link>
            </Button>
          </div>
        </FadeIn>

        {/* Soft Section Separator Ribbon */}
        <div className="my-7 flex justify-center">
          <ModernTatreezAccent variant="ribbon" className="max-w-xl h-1.5 opacity-15 dark:opacity-10" />
        </div>

        <FadeIn delay={0.5}>
          <dl className="mx-auto mt-2 grid max-w-3xl grid-cols-1 gap-3 sm:grid-cols-3">
            {[
              ["stat_citizens", "—"],
              ["stat_services", t("stat_services_value")],
              ["stat_transactions", "—"],
            ].map(([label, value]) => (
              <div key={label} className="rounded-xl border border-border/60 backdrop-blur-md bg-background/70 px-4 py-3 shadow-xs">
                <dt className="text-xs font-semibold text-muted-foreground">{t(label)}</dt>
                <dd className="mt-1 text-lg font-bold tabular-nums text-foreground">{value}</dd>
              </div>
            ))}
          </dl>
        </FadeIn>
      </div>
    </section>
  );
}
