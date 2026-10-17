"use client";

import { FadeIn } from "@/components/animations/FadeIn";
import { ServicesGrid } from "@/components/sections/ServicesGrid";
import { Link } from "@/i18n/routing";
import { useTranslations } from "next-intl";

export default function ServicesPage() {
  const t = useTranslations("Directory");

  return (
    <div className="bg-background py-8">
      <div className="mx-auto flex max-w-7xl flex-col items-center px-4 sm:px-6 lg:px-8">
        <FadeIn className="mt-8 mb-4 text-center">
          <h1 className="text-3xl font-bold tracking-tight text-foreground sm:text-4xl lg:text-5xl">
            {t("title")}
          </h1>
          <p className="mx-auto mt-4 max-w-2xl text-base font-medium text-muted-foreground sm:text-lg">
            {t("subtitle")}
          </p>
        </FadeIn>

        <div className="w-full">
          <ServicesGrid />
        </div>

        <FadeIn delay={0.2} className="relative mt-8 grid w-full grid-cols-1 overflow-hidden rounded-lg border border-border bg-card shadow-sm sm:grid-cols-2 sm:divide-x sm:divide-border rtl:sm:divide-x-reverse">
          <Link href="/news" className="p-8 text-center transition-colors hover:bg-muted group">
            <h3 className="text-2xl font-bold group-hover:text-primary">{t("news")}</h3>
            <p className="mt-2 text-sm text-muted-foreground">{t("news_desc")}</p>
          </Link>
          <Link href="/charity" className="p-8 text-center transition-colors hover:bg-muted group">
            <h3 className="text-2xl font-bold group-hover:text-primary">{t("charity")}</h3>
            <p className="mt-2 text-sm text-muted-foreground">{t("charity_desc")}</p>
          </Link>
        </FadeIn>
      </div>
    </div>
  );
}
