"use client";

import { useTranslations } from "next-intl";
import { Link } from "@/i18n/routing";
import { BrandMark, OfficialCrest } from "@/components/brand/BrandMark";
import { ModernTatreezAccent } from "@/components/ui/ModernTatreezAccent";

export function Footer() {
  const t = useTranslations("Footer");
  const nav = useTranslations("Navigation");
  const st = useTranslations("Services");
  const currentYear = new Date().getFullYear();

  const sections = [
    {
      title: t("services"),
      links: [
        { label: st("government"), href: "/services/government" },
        { label: st("bills"), href: "/services/bills" },
        { label: st("violations"), href: "/services/violations" },
        { label: st("aid"), href: "/services/aid" },
        { label: st("healthcare"), href: "/services/healthcare" },
      ],
    },
    {
      title: t("explore"),
      links: [
        { label: nav("transport"), href: "/transport" },
        { label: nav("restaurants"), href: "/restaurants" },
        { label: nav("jobs"), href: "/jobs" },
        { label: nav("news"), href: "/news" },
        { label: nav("charity"), href: "/charity" },
      ],
    },
    {
      title: t("platform"),
      links: [
        { label: nav("about"), href: "/about" },
        { label: nav("dashboard"), href: "/dashboard" },
        { label: st("border"), href: "/services/border" },
        { label: st("hajj"), href: "/services/hajj" },
        { label: t("admin"), href: "/admin" },
      ],
    },
  ];

  return (
    <footer className="mt-auto w-full overflow-visible border-t border-border bg-card text-card-foreground">
      <ModernTatreezAccent variant="ribbon" className="opacity-10 dark:opacity-5" />
      <div className="mx-auto max-w-7xl px-4 py-12 sm:px-6 md:py-16 lg:px-8">
        <div className="grid grid-cols-2 md:grid-cols-4 gap-8 mb-12">
          <div className="col-span-2 md:col-span-1">
            <div className="flex items-start gap-3 mb-4">
              <BrandMark size={36} />
              <OfficialCrest size={40} className="opacity-80 hidden sm:block" />
            </div>
            <p className="text-sm text-muted-foreground leading-relaxed max-w-[240px]">
              {t("tagline")}
            </p>
          </div>

          {sections.map((section) => (
            <nav key={section.title} aria-label={section.title}>
              <h4 className="font-bold text-foreground mb-4 text-sm tracking-wide">{section.title}</h4>
              <ul className="space-y-2.5">
                {section.links.map((link) => (
                  <li key={link.href}>
                    <Link
                      href={link.href}
                      className="text-sm text-muted-foreground hover:text-foreground transition-colors cursor-pointer inline-block"
                    >
                      {link.label}
                    </Link>
                  </li>
                ))}
              </ul>
            </nav>
          ))}
        </div>

        <div className="pt-8 border-t border-border flex flex-col sm:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-2.5">
            <BrandMark size={24} withWordmark={false} href={null} />
            <p className="text-xs text-muted-foreground">
              © {currentYear} PALPASS — {t("rights")}
            </p>
          </div>
          <div className="flex items-center gap-4 text-xs text-muted-foreground">
            <Link href="/privacy" className="hover:text-foreground transition-colors cursor-pointer">
              {t("privacy")}
            </Link>
            <span className="text-border">·</span>
            <Link href="/terms" className="hover:text-foreground transition-colors cursor-pointer">
              {t("terms")}
            </Link>
          </div>
        </div>
      </div>
    </footer>
  );
}
