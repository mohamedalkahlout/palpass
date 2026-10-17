"use client";

import { useLocale, useTranslations } from "next-intl";
import { usePathname, useRouter } from "@/i18n/routing";

export function LanguageSwitcher() {
  const locale = useLocale();
  const router = useRouter();
  const pathname = usePathname();
  const t = useTranslations("Common");

  const switchLanguage = (newLocale) => {
    router.replace(pathname, { locale: newLocale });
  };

  return (
    <div className="flex items-center gap-1 rounded-lg border border-border bg-muted p-1 text-muted-foreground">
      <button
        type="button"
        onClick={() => switchLanguage("en")}
        title={t("lang_en")}
        className={`rounded-sm px-2.5 py-1.5 text-xs font-bold ${
          locale === "en"
            ? "bg-card text-card-foreground shadow-sm"
            : "hover:text-foreground"
        }`}
      >
        EN
      </button>
      <button
        type="button"
        onClick={() => switchLanguage("ar")}
        title={t("lang_ar")}
        className={`rounded-sm px-2.5 py-1.5 text-xs font-bold ${
          locale === "ar"
            ? "bg-card text-card-foreground shadow-sm"
            : "hover:text-foreground"
        }`}
      >
        AR
      </button>
    </div>
  );
}
