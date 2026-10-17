"use client";

import { Link } from "@/i18n/routing";
import { useLocale, useTranslations } from "next-intl";
import { EagleWatermark, OfficialCrest } from "@/components/brand/BrandMark";
import { Button } from "@/components/ui/button";
import { ArrowLeft, ArrowRight } from "lucide-react";

export function CivicServiceShell({ title, description, children }) {
  const commonT = useTranslations("Common");
  const locale = useLocale();
  const isAr = locale === "ar";

  return (
    <div className="bg-background py-12 sm:py-16">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <article className="relative overflow-hidden rounded-lg border border-border bg-card p-8 text-card-foreground sm:p-12">
          <EagleWatermark opacity={0.08} />
          <div className="relative z-10 flex flex-col items-start gap-5">
            <div className="inline-flex items-center gap-2 rounded-full border border-border bg-background px-3 py-1 text-sm font-semibold text-primary">
              <OfficialCrest size={22} />
              {commonT("commissioning")}
            </div>
            <h1 className="text-3xl font-bold tracking-tight text-foreground sm:text-4xl">{title}</h1>
            {description ? (
              <p className="max-w-2xl text-base font-medium leading-relaxed text-muted-foreground">{description}</p>
            ) : null}
            <Button asChild variant="outline" className="rounded-full">
              <Link href="/">
                {isAr ? <ArrowRight className="h-4 w-4" /> : <ArrowLeft className="h-4 w-4" />}
                {commonT("back_home")}
              </Link>
            </Button>
          </div>
        </article>
        {children ? <div className="mt-8">{children}</div> : null}
      </div>
    </div>
  );
}
