"use client";

import { useLocale, useTranslations } from "next-intl";
import { Link, usePathname, useRouter } from "@/i18n/routing";
import { ChevronLeft } from "lucide-react";

const SERVICE_KEYS = {
  government: "government",
  border: "border",
  hajj: "hajj",
  violations: "violations",
  bills: "bills",
  healthcare: "healthcare",
};

const BREADCRUMB_KEYS = {
  documents: "documents",
  appointments: "appointments",
  charity: "charity",
  justice: "justice",
  reports: "reports",
  licenses: "licenses",
  "aid-ration": "aid_ration",
  "health-records": "health_records",
  transport: "transport",
  aid: "aid",
  jobs: "jobs",
  education: "education",
  "tax-clearance": "tax_clearance",
  family: "family",
  complaints: "complaints",
  tenders: "tenders",
  "cabinet-aid": "cabinet_aid",
  gazette: "gazette",
  "jerusalem-fund": "jerusalem_fund",
  "driving-license": "driving_license",
  hospitals: "hospitals",
  verify: "verify",
  track: "track",
};

export function CivicBreadcrumbs() {
  const pathname = usePathname() || "/";
  const router = useRouter();
  const locale = useLocale();
  const tNav = useTranslations("Navigation");
  const tSvc = useTranslations("Services");
  const t = useTranslations("Breadcrumbs");
  const dir = locale === "ar" ? "rtl" : "ltr";

  const segments = pathname.split("/").filter(Boolean);
  const root = segments[0];
  if (
    !root ||
    !["services", "documents", "appointments", "charity", "transport", "verify", "track"].includes(root)
  ) {
    return null;
  }

  const crumbLabel = (segment, index) => {
    if (index === 0 && segment === "services") return tNav("services");
    if (BREADCRUMB_KEYS[segment]) return t(BREADCRUMB_KEYS[segment]);
    if (SERVICE_KEYS[segment]) return tSvc(SERVICE_KEYS[segment]);
    return segment;
  };

  const parent = segments.length > 1 ? `/${segments.slice(0, -1).join("/")}` : "/";

  const goBack = () => {
    let internal = false;
    try {
      if (document.referrer) {
        internal = new URL(document.referrer).origin === window.location.origin;
      }
    } catch {
      internal = false;
    }
    if (window.history.length > 2 && internal) {
      router.back();
      return;
    }
    router.push(parent);
  };

  return (
    <div dir={dir} className="border-b border-border bg-background">
      <div className="page-wrap flex flex-wrap items-center gap-3 py-3 text-sm">
        <button
          type="button"
          onClick={goBack}
          className="inline-flex items-center gap-1 rounded-lg border border-border px-3 py-1.5 font-semibold text-foreground hover:bg-muted"
        >
          <ChevronLeft className="h-4 w-4 rtl:rotate-180" aria-hidden />
          {t("back")}
        </button>
        <nav aria-label={tNav("home")} className="flex flex-wrap items-center gap-1 text-muted-foreground">
          <Link href="/" className="font-semibold text-foreground hover:text-primary">
            {tNav("home")}
          </Link>
          {segments.map((segment, index) => {
            const href = `/${segments.slice(0, index + 1).join("/")}`;
            const last = index === segments.length - 1;
            return (
              <span key={href} className="inline-flex items-center gap-1">
                <ChevronLeft className="h-3.5 w-3.5 rtl:rotate-180" aria-hidden />
                {last ? (
                  <span className="font-semibold text-primary">{crumbLabel(segment, index)}</span>
                ) : (
                  <Link href={href} className="hover:text-foreground">{crumbLabel(segment, index)}</Link>
                )}
              </span>
            );
          })}
        </nav>
      </div>
    </div>
  );
}
