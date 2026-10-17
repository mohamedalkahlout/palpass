"use client";

import { FadeIn } from "@/components/animations/FadeIn";
import Image from "next/image";
import { Link } from "@/i18n/routing";
import { Button } from "@/components/ui/button";
import { Fingerprint, Lock, Zap, Building2 } from "lucide-react";
import { useTranslations, useLocale } from "next-intl";
import { OfficialCrest, EagleWatermark } from "@/components/brand/BrandMark";
import { governmentOrganizationJsonLd } from "@/lib/seo/government-metadata";

export default function AboutPage() {
  const t = useTranslations("About");
  const locale = useLocale();
  const orgJsonLd = governmentOrganizationJsonLd({ locale });
  const pillars = [
    { title: t("sovereignty"), desc: t("sovereignty_desc"), icon: <Building2 className="w-8 h-8" /> },
    { title: t("identity"), desc: t("identity_desc"), icon: <Fingerprint className="w-8 h-8" /> },
    { title: t("speed"), desc: t("speed_desc"), icon: <Zap className="w-8 h-8" /> },
    { title: t("privacy"), desc: t("privacy_desc"), icon: <Lock className="w-8 h-8" /> },
  ];

  return (
    <>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(orgJsonLd) }} />
      <div className="bg-background py-16 px-4 sm:px-6 lg:px-8">
      <div className="max-w-6xl mx-auto">
        <div className="flex flex-col-reverse lg:flex-row gap-12 items-center mb-20">
          <div className="flex-1 space-y-8">
            <FadeIn>
              <h1 className="text-4xl md:text-6xl font-bold tracking-tight text-foreground drop-shadow-sm leading-tight">
                {t("title")}
              </h1>
            </FadeIn>
            <FadeIn delay={0.1}>
              <p className="text-xl text-muted-foreground font-medium leading-relaxed">
                {t("body")}
              </p>
            </FadeIn>
            <FadeIn delay={0.2}>
              <Link href="/auth/register">
                <Button className="rounded-lg px-10 py-7 text-lg hover:-translate-y-1 transition-applesque font-bold bg-primary hover:bg-primary/90 text-primary-foreground">
                  {t("cta")}
                </Button>
              </Link>
            </FadeIn>
          </div>

          <div className="flex-1 w-full lg:w-1/2 relative h-[500px]">
            <FadeIn delay={0.3} className="h-full">
              <article className="w-full h-full relative rounded-lg overflow-hidden border border-border bg-[color:var(--brand-900)]">
                <EagleWatermark opacity={0.22} />
                <div className="absolute inset-0 flex items-center justify-center">
                  <OfficialCrest size={180} />
                </div>
                <Image
                  src="/images/branding/palpass-logo.png"
                  alt="PALPASS"
                  width={64}
                  height={64}
                  className="absolute top-6 start-6 rounded-[22%] ring-1 ring-white/30 bg-white"
                />
                <div className="absolute bottom-6 left-6 right-6">
                  <p className="text-white/90 text-sm font-medium tracking-wide">
                    {t("hash_label")}
                  </p>
                </div>
              </article>
            </FadeIn>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          {pillars.map((pillar, i) => (
            <FadeIn key={pillar.title} delay={0.4 + i * 0.1}>
              <article className="p-8 rounded-lg h-full transition-colors border border-border bg-card">
                <div className="mb-6 text-primary p-4 bg-primary/10 rounded-lg inline-block">
                  {pillar.icon}
                </div>
                <h3 className="text-xl font-bold text-foreground mb-3">{pillar.title}</h3>
                <p className="text-sm text-muted-foreground leading-relaxed font-medium">{pillar.desc}</p>
              </article>
            </FadeIn>
          ))}
        </div>
      </div>
    </div>
    </>
  );
}
