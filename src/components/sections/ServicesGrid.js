"use client";

import { useTranslations } from "next-intl";
import { FadeIn } from "@/components/animations/FadeIn";
import { ModernTatreezAccent } from "@/components/ui/ModernTatreezAccent";
import { Link } from "@/i18n/routing";
import Image from "next/image";
import {
  GraduationCap,
  Landmark,
  Users,
  Megaphone,
  ScrollText,
  HeartHandshake,
  FileSearch,
  Building2,
  CreditCard,
  Stethoscope,
  Car,
  IdCard,
  Hospital,
  Globe,
} from "lucide-react";

export function ServicesGrid() {
  const t = useTranslations("Services");

  const services = [
    {
      id: "gov",
      href: "/services/government",
      title: t("government"),
      desc: t("government_desc"),
      icon: <Building2 className="h-6 w-6 text-primary" />,
      banner: "/images/civic/smart-id-pass.webp",
    },
    {
      id: "border",
      href: "/services/border",
      title: t("border"),
      desc: "تنسيق تصاريح السفر الرسمية عبر المعابر الوطنية مع اعتماد فوري ومتابعة رقمية.",
      icon: <Globe className="h-6 w-6 text-primary" />,
      banner: "/images/civic/crossing-terminal.webp",
    },
    {
      id: "transport",
      href: "/transport",
      title: t("transport"),
      desc: t("transport_desc"),
      icon: <Car className="h-6 w-6 text-primary" />,
      banner: "/images/civic/palestine-roads.webp",
    },
    {
      id: "health",
      href: "/services/healthcare",
      title: t("health"),
      desc: t("health_desc"),
      icon: <Stethoscope className="h-6 w-6 text-primary" />,
      banner: "/images/civic/medical-care.webp",
    },
    {
      id: "education",
      href: "/services/education",
      title: t("education_hub"),
      desc: t("education_hub_desc"),
      icon: <GraduationCap className="h-6 w-6 text-primary" />,
      banner: "/images/civic/education-future.webp",
    },
    {
      id: "family",
      href: "/services/family",
      title: t("family_hub"),
      desc: t("family_hub_desc"),
      icon: <Users className="h-6 w-6 text-primary" />,
      banner: "/images/civic/family-registry.webp",
    },
    {
      id: "finance",
      href: "/services/bills",
      title: t("finance"),
      desc: t("finance_desc"),
      icon: <CreditCard className="h-6 w-6 text-primary" />,
    },
    {
      id: "tax",
      href: "/services/tax-clearance",
      title: t("tax_hub"),
      desc: t("tax_hub_desc"),
      icon: <Landmark className="h-6 w-6 text-primary" />,
    },
    {
      id: "cabinet-aid",
      href: "/services/cabinet-aid",
      title: t("cabinet_aid_hub"),
      desc: t("cabinet_aid_hub_desc"),
      icon: <HeartHandshake className="h-6 w-6 text-primary" />,
      banner: "/images/civic/olive-harvest.webp",
    },
    {
      id: "complaints",
      href: "/services/complaints",
      title: t("complaints_hub"),
      desc: t("complaints_hub_desc"),
      icon: <Megaphone className="h-6 w-6 text-primary" />,
    },
    {
      id: "tenders",
      href: "/services/tenders",
      title: t("tenders_hub"),
      desc: t("tenders_hub_desc"),
      icon: <FileSearch className="h-6 w-6 text-primary" />,
    },
    {
      id: "gazette",
      href: "/services/gazette",
      title: t("gazette_hub"),
      desc: t("gazette_hub_desc"),
      icon: <ScrollText className="h-6 w-6 text-primary" />,
    },
  ];

  return (
    <section className="relative z-10 bg-background py-16 sm:py-20" id="services">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <ModernTatreezAccent variant="ribbon" className="mb-12 opacity-15 dark:opacity-5" />
        <FadeIn delay={0.1} className="mb-12 text-center">
          <h2 className="mb-4 text-3xl font-bold tracking-tight text-foreground sm:text-4xl">
            {t("section_title")}
          </h2>
          <p className="mx-auto max-w-2xl text-base font-medium text-muted-foreground sm:text-lg">
            {t("section_subtitle")}
          </p>
        </FadeIn>

        <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-4">
          {services.map((service) => (
            <FadeIn key={service.id} delay={0.08} direction="up" fullWidth>
              <Link href={service.href} className="block h-full">
                <article className="motion-lift group relative flex h-full flex-col overflow-hidden rounded-2xl border border-border bg-card p-6 transition-all duration-300 ease-[cubic-bezier(0.16,1,0.3,1)] hover:-translate-y-0.5 hover:border-primary/40 hover:shadow-sm">
                  {service.banner ? (
                    <div className="relative -mx-6 -mt-6 mb-4 h-28 overflow-hidden border-b border-border/50 bg-muted">
                      <Image
                        src={service.banner}
                        alt=""
                        fill
                        sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 25vw"
                        className="object-cover opacity-85 transition-transform duration-500 ease-out group-hover:scale-105"
                      />
                      <div className="absolute inset-0 bg-gradient-to-t from-card via-card/30 to-transparent" />
                    </div>
                  ) : null}
                  <div className="mb-4 flex h-12 w-12 items-center justify-center rounded-xl bg-primary/10 border border-primary/20">
                    {service.icon}
                  </div>
                  <h3 className="mb-2 text-lg font-bold tracking-tight text-foreground">
                    {service.title}
                  </h3>
                  <p className="text-sm leading-relaxed font-medium text-muted-foreground">
                    {service.desc}
                  </p>
                </article>
              </Link>
            </FadeIn>
          ))}
        </div>
      </div>
    </section>
  );
}
