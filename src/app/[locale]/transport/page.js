"use client";

import { useLocale, useTranslations } from "next-intl";
import Image from "next/image";
import { Link } from "@/i18n/routing";
import { FadeIn } from "@/components/animations/FadeIn";
import { Car, Bus } from "lucide-react";
import { ModernTatreezAccent } from "@/components/ui/ModernTatreezAccent";

export default function TransportPage() {
  const t = useTranslations("Transport");
  const locale = useLocale();
  const dir = locale === "ar" ? "rtl" : "ltr";

  return (
    <div dir={dir} className="bg-background px-4 py-16 sm:px-6 lg:px-8">
      <div className="mx-auto max-w-6xl">
        <FadeIn>
          <div className="relative mb-12 flex h-[320px] sm:h-[380px] items-center justify-center overflow-hidden rounded-2xl border border-emerald-950/10 dark:border-white/10 shadow-sm">
            <Image
              src="/images/civic/palestine-roads.webp"
              alt="Palestine Scenic Roads & Transport"
              fill
              priority
              sizes="(max-width: 1200px) 100vw, 1152px"
              className="object-cover"
            />
            <div className="absolute inset-0 bg-gradient-to-t from-background/95 via-background/40 to-background/20" />
            
            <div className="relative z-10 px-4 text-center">
              <p className="mb-3 text-xs font-bold tracking-wide text-primary uppercase">
                {t("terminals")}
              </p>
              <h1 className="mb-4 text-3xl font-bold tracking-tight text-foreground sm:text-5xl">
                {t("hub_title")}
              </h1>
              <p className="mx-auto max-w-2xl text-base font-medium text-muted-foreground sm:text-lg">
                {t("hub_subtitle")}
              </p>
            </div>
          </div>
        </FadeIn>

        <ModernTatreezAccent variant="ribbon" className="mb-10 opacity-15 dark:opacity-5" />

        <div className="grid grid-cols-1 gap-8 md:grid-cols-2">
          <FadeIn delay={0.1}>
            <Link href="/transport/taxis" className="group block">
              <div className="relative flex h-[350px] flex-col overflow-hidden rounded-2xl border border-border bg-card p-8 transition-all duration-300 hover:-translate-y-1 hover:border-primary/40 hover:shadow-sm">
                <div className="pointer-events-none absolute right-0 top-0 -mr-16 -mt-16 h-64 w-64 rounded-full bg-primary/5 transition-colors group-hover:bg-primary/10" />

                <div className="relative z-10 mb-6 flex h-16 w-16 items-center justify-center rounded-xl border border-border bg-background transition-transform group-hover:scale-110">
                  <Car className="h-8 w-8 text-primary" />
                </div>

                <div className="relative z-10 flex flex-1 flex-col justify-end text-start">
                  <h2 className="mb-3 text-2xl font-bold tracking-tight text-foreground">{t("taxis_mode")}</h2>
                  <p className="text-sm leading-relaxed text-muted-foreground">
                    {t("taxis_mode_desc")}
                  </p>
                </div>
              </div>
            </Link>
          </FadeIn>

          <FadeIn delay={0.2}>
            <Link href="/transport/buses" className="group block">
              <div className="relative flex h-[350px] flex-col overflow-hidden rounded-2xl border border-border bg-card p-8 transition-all duration-300 hover:-translate-y-1 hover:border-primary/40 hover:shadow-sm">
                <div className="pointer-events-none absolute right-0 top-0 -mr-16 -mt-16 h-64 w-64 rounded-full bg-primary/5 transition-colors group-hover:bg-primary/10" />

                <div className="relative z-10 mb-6 flex h-16 w-16 items-center justify-center rounded-xl border border-border bg-background transition-transform group-hover:scale-110">
                  <Bus className="h-8 w-8 text-primary" />
                </div>

                <div className="relative z-10 flex flex-1 flex-col justify-end text-start">
                  <h2 className="mb-3 text-2xl font-bold tracking-tight text-foreground">{t("buses_mode")}</h2>
                  <p className="text-sm leading-relaxed text-muted-foreground">
                    {t("buses_mode_desc")}
                  </p>
                </div>
              </div>
            </Link>
          </FadeIn>
        </div>
      </div>
    </div>
  );
}
