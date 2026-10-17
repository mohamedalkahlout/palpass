"use client";

import { useState } from "react";
import { useTranslations } from "next-intl";
import Image from "next/image";
import { Link } from "@/i18n/routing";
import { DataTable } from "@/components/ui/DataTable";
import { ModernTatreezAccent } from "@/components/ui/ModernTatreezAccent";
import {
  Car,
  FileCheck,
  GraduationCap,
  Landmark,
  Lock,
  ScrollText,
  ShieldCheck,
  Stamp,
  Users,
  Shield,
  CreditCard,
  Plane,
} from "lucide-react";

const TOP = [
  { href: "/services/border", key: "svc_border", icon: Stamp },
  { href: "/services/driving-license", key: "svc_licence", icon: Car },
  { href: "/services/bills", key: "svc_bills", icon: FileCheck },
  { href: "/services/tax-clearance", key: "svc_tax", icon: Landmark },
  { href: "/services/education", key: "svc_education", icon: GraduationCap },
  { href: "/services/family", key: "svc_family", icon: Users },
];

const HUBS = [
  {
    title: "cat_family",
    items: [
      { href: "/services/family", key: "svc_family" },
      { href: "/services/healthcare", key: "svc_health" },
      { href: "/services/hospitals", key: "svc_hospitals" },
    ],
  },
  {
    title: "cat_travel",
    items: [
      { href: "/services/border", key: "svc_border" },
      { href: "/transport", key: "svc_transit" },
      { href: "/services/driving-license", key: "svc_licence" },
    ],
  },
  {
    title: "cat_business",
    items: [
      { href: "/services/tax-clearance", key: "svc_tax" },
      { href: "/services/tenders", key: "svc_tenders" },
      { href: "/services/licenses", key: "svc_trade" },
      { href: "/services/bills", key: "svc_bills" },
    ],
  },
  {
    title: "cat_justice",
    items: [
      { href: "/services/education", key: "svc_education" },
      { href: "/services/justice", key: "svc_justice" },
      { href: "/services/reports", key: "svc_clearance" },
    ],
  },
];

export function CitizenHome({ editions = [] }) {
  const t = useTranslations("HomeCivic");
  const [query, setQuery] = useState("");
  const needle = query.trim().toLowerCase();

  const matches = (key) => {
    const blob = `${t(key)} ${t(`kw_${key}`)}`.toLowerCase();
    return !needle || blob.includes(needle);
  };

  const top = TOP.filter((item) => matches(item.key));
  const hubs = HUBS.map((hub) => ({
    ...hub,
    items: hub.items.filter((item) => matches(item.key)),
  })).filter((hub) => hub.items.length);
  const rows = editions
    .filter((edition) => {
      if (!needle) return true;
      const blob = `${edition.edition_number} ${edition.title || ""} ${edition.summary || ""}`.toLowerCase();
      return blob.includes(needle);
    })
    .slice(0, 6)
    .map((edition) => ({
      id: edition.id,
      edition: edition.edition_number,
      date: edition.issuance_date,
      title: edition.title,
    }));

  const nothing = needle && top.length === 0 && hubs.length === 0 && rows.length === 0;

  return (
    <div className="flex flex-col">
      {/* Top Ambient Tatreez Ribbon */}
      <ModernTatreezAccent variant="ribbon" className="opacity-15 dark:opacity-5" />

      {/* Main Search & Overview Section */}
      <section className="border-b border-border bg-card relative overflow-hidden">
        <div className="page-wrap grid items-center gap-8 py-10 lg:grid-cols-[minmax(0,1.4fr)_20rem]">
          <div>
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-primary/10 text-primary border border-primary/20 text-xs font-bold mb-3">
              <Shield className="w-3.5 h-3.5" />
              <span>المنظومة الوطنية الموحدة للهوية الرقمية</span>
            </div>
            <h1 className="max-w-3xl text-2xl font-bold leading-snug text-foreground sm:text-3xl lg:text-4xl">
              {t("title")}
            </h1>
            <p className="mt-3 max-w-2xl text-sm leading-relaxed text-muted-foreground sm:text-base">
              {t("lead")}
            </p>
            <label htmlFor="civic-search" className="mt-6 block text-sm font-semibold text-foreground">
              {t("search_label")}
            </label>
            <input
              id="civic-search"
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              placeholder={t("search_placeholder")}
              className="mt-2 h-12 w-full rounded-xl border border-border bg-background px-4 text-sm shadow-xs outline-none focus-visible:ring-2 focus-visible:ring-primary"
            />
            {nothing ? <p className="mt-3 text-sm text-muted-foreground">{t("search_empty")}</p> : null}
          </div>

          {/* Secondary Visual & Sovereign Civic Card */}
          <aside className="rounded-2xl border border-emerald-950/10 dark:border-white/10 bg-background/90 p-5 shadow-sm relative overflow-hidden group">
            <div className="relative h-48 w-full rounded-2xl border border-emerald-950/10 dark:border-white/10 shadow-sm overflow-hidden mb-4 group">
              <Image
                src="/images/civic/heritage-land.webp"
                alt="أرض فلسطين وجذور الهوية السيادية"
                fill
                sizes="(max-width: 768px) 100vw, 320px"
                className="object-cover transition-transform duration-500 group-hover:scale-105"
              />
              <div className="absolute inset-0 bg-gradient-to-t from-background/90 via-background/40 to-transparent" />
              <div className="absolute bottom-2.5 start-3 end-3 flex items-center justify-between text-xs font-bold text-foreground">
                <span className="flex items-center gap-1.5">
                  <ShieldCheck className="w-4 h-4 text-primary" />
                  <span>أرض الآباء والجذور السيادية</span>
                </span>
                <span className="font-mono text-[11px] text-primary">PALPASS</span>
              </div>
            </div>

            <h2 className="text-sm font-bold text-foreground">{t("side_title")}</h2>
            <ul className="mt-2.5 space-y-2 text-xs leading-relaxed text-muted-foreground">
              <li className="flex items-center gap-2">
                <span className="w-1.5 h-1.5 rounded-full bg-primary" />
                <span>{t("side_nid")}</span>
              </li>
              <li className="flex items-center gap-2">
                <span className="w-1.5 h-1.5 rounded-full bg-primary" />
                <span>{t("side_wallet")}</span>
              </li>
              <li className="flex items-center gap-2">
                <span className="w-1.5 h-1.5 rounded-full bg-primary" />
                <span>{t("side_crossings")}</span>
              </li>
            </ul>
          </aside>
        </div>
      </section>

      {/* Quick Services Section */}
      <section className="page-wrap py-10 relative">
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-2.5">
            <ModernTatreezAccent variant="star" className="w-6 h-6 opacity-30 dark:opacity-20" />
            <h2 className="text-xl font-bold tracking-tight text-foreground">{t("requested_title")}</h2>
          </div>
          <Link href="/services" className="text-xs font-bold text-primary hover:underline">
            عرض كافة الخدمات &larr;
          </Link>
        </div>

        <div className="grid gap-3.5 sm:grid-cols-2 lg:grid-cols-3">
          {top.map((item) => {
            const Icon = item.icon;
            return (
              <Link
                key={item.href}
                href={item.href}
                className="group flex items-start gap-3.5 rounded-xl border border-border bg-card p-4 transition-all duration-200 hover:border-primary/40 hover:bg-muted/50 hover:shadow-xs"
              >
                <div className="p-2 rounded-lg bg-primary/10 text-primary border border-primary/20 shrink-0 group-hover:scale-105 transition-transform">
                  <Icon className="h-5 w-5" aria-hidden />
                </div>
                <div className="min-w-0">
                  <span className="text-sm font-bold text-foreground block">{t(item.key)}</span>
                  <span className="text-xs text-muted-foreground mt-0.5 block truncate">خدمة وطنية معتمدة رسمياً</span>
                </div>
              </Link>
            );
          })}
        </div>
      </section>

      {/* Fellahi Tatreez Ambient Ribbon */}
      <ModernTatreezAccent variant="ribbon" className="opacity-15 dark:opacity-5 my-2" />

      {/* Categorized Hubs Section */}
      <section className="border-y border-border bg-card">
        <div className="page-wrap grid gap-6 py-10 md:grid-cols-2 lg:grid-cols-4">
          {hubs.map((hub) => (
            <div key={hub.title} className="rounded-xl border border-border/80 bg-background/60 p-4">
              <h2 className="text-sm font-bold text-foreground mb-3 flex items-center gap-1.5">
                <span className="w-2 h-2 rounded-full bg-primary" />
                {t(hub.title)}
              </h2>
              <ul className="divide-y divide-border/60">
                {hub.items.map((item) => (
                  <li key={item.href + item.key}>
                    <Link
                      href={item.href}
                      className="block py-2 text-xs font-semibold text-muted-foreground transition hover:text-primary hover:ps-1"
                    >
                      {t(item.key)}
                    </Link>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>
      </section>

      {/* Official Gazette Section */}
      <section className="page-wrap py-10">
        <div className="mb-4 flex flex-wrap items-end justify-between gap-3">
          <div className="flex items-center gap-2">
            <ModernTatreezAccent variant="olive" className="w-8 h-4 opacity-30 dark:opacity-20" />
            <h2 className="text-xl font-bold tracking-tight text-foreground">{t("gazette_title")}</h2>
          </div>
          <Link href="/services/gazette" className="text-xs font-bold text-primary hover:underline">
            {t("gazette_open")} &larr;
          </Link>
        </div>
        <DataTable
          caption={t("gazette_title")}
          empty={t("gazette_empty")}
          columns={[
            { key: "edition", header: t("gazette_edition"), numeric: true },
            { key: "date", header: t("gazette_date") },
            { key: "title", header: t("gazette_name") },
          ]}
          rows={rows}
        />
      </section>

      {/* Sovereign Civic Trust & Security Section with Civic Community Photo */}
      <section className="border-t border-border bg-card relative overflow-hidden">
        <div className="page-wrap py-12">
          <div className="grid gap-8 lg:grid-cols-2 items-center mb-8">
            <div>
              <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-emerald-700/10 text-emerald-800 dark:text-emerald-400 border border-emerald-700/20 text-xs font-bold mb-3">
                <ShieldCheck className="w-3.5 h-3.5" />
                <span>الضمانات السيادية والتشفير الوطني</span>
              </div>
              <h2 className="text-2xl font-bold tracking-tight text-foreground sm:text-3xl">
                {t("trust_title")}
              </h2>
              <p className="mt-3 text-sm leading-relaxed text-muted-foreground">
                تعتمد منصة PALPASS أعلى المعايير الأمنية المعتمدة لحماية الهوية الرقمية والخصوصية الفردية للمواطنين في القدس والضفة الغربية وقطاع غزة وكافة أماكن تواجدهم.
              </p>

              <ul className="mt-6 space-y-3">
                <li className="flex gap-3 rounded-xl border border-border bg-background p-3.5">
                  <ShieldCheck className="h-5 w-5 shrink-0 text-primary mt-0.5" aria-hidden />
                  <div>
                    <h3 className="text-xs font-bold text-foreground">تشفير سيادي موثق</h3>
                    <p className="text-xs text-muted-foreground leading-relaxed mt-0.5">{t("trust_crypto")}</p>
                  </div>
                </li>
                <li className="flex gap-3 rounded-xl border border-border bg-background p-3.5">
                  <ScrollText className="h-5 w-5 shrink-0 text-primary mt-0.5" aria-hidden />
                  <div>
                    <h3 className="text-xs font-bold text-foreground">شهادات رقمية ورموز QR آمنة</h3>
                    <p className="text-xs text-muted-foreground leading-relaxed mt-0.5">{t("trust_qr")}</p>
                  </div>
                </li>
                <li className="flex gap-3 rounded-xl border border-border bg-background p-3.5">
                  <Lock className="h-5 w-5 shrink-0 text-primary mt-0.5" aria-hidden />
                  <div>
                    <h3 className="text-xs font-bold text-foreground">حماية البيانات والخصوصية الكاملة</h3>
                    <p className="text-xs text-muted-foreground leading-relaxed mt-0.5">{t("trust_privacy")}</p>
                  </div>
                </li>
              </ul>
            </div>

            {/* Dignified Community Civic Image */}
            <div className="relative h-[340px] sm:h-[400px] w-full rounded-2xl border border-emerald-950/10 dark:border-white/10 shadow-sm overflow-hidden">
              <Image
                src="/images/civic/community-solidarity.webp"
                alt="التكافل والصمود المجتمعي في فلسطين"
                fill
                sizes="(max-width: 1024px) 100vw, 50vw"
                className="object-cover"
              />
              <div className="absolute inset-0 bg-gradient-to-t from-background/90 via-background/40 to-transparent" />
              <div className="absolute bottom-4 start-5 end-5">
                <span className="text-xs font-bold text-primary block">كرامة وأمان &bull; PALPASS</span>
                <p className="text-sm font-semibold text-foreground mt-0.5">
                  منظومة تخدم المواطن الفلسطيني بكرامة وكفاءة رقمية متقدمة
                </p>
              </div>
            </div>
          </div>

          <ModernTatreezAccent variant="ribbon" className="opacity-15 dark:opacity-5" />
        </div>
      </section>
    </div>
  );
}
