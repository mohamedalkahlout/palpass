"use client";

import { useEffect, useMemo, useState } from "react";
import { FadeIn } from "@/components/animations/FadeIn";
import { BusCard } from "@/components/transport/BusCard";
import { getBusRoutes } from "@/lib/supabase/service";
import { Search, Bus } from "lucide-react";

import { useLocale, useTranslations } from "next-intl";
import { GOVERNORATES, matchesGovernorate } from "@/lib/transport/governorates";

export default function BusesPage() {
  const t = useTranslations("Transport");
  const locale = useLocale();
  const [search, setSearch] = useState("");
  const [governorate, setGovernorate] = useState("all");
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function load() {
      setLoading(true);
      const data = await getBusRoutes(search || null);
      setItems(data || []);
      setLoading(false);
    }
    const timer = setTimeout(load, search ? 500 : 0);
    return () => clearTimeout(timer);
  }, [search]);

  const visible = useMemo(
    () =>
      items.filter(
        (bus) =>
          matchesGovernorate(bus.from_city, governorate) ||
          matchesGovernorate(bus.to_city, governorate)
      ),
    [items, governorate]
  );

  return (
    <div dir={locale === "ar" ? "rtl" : "ltr"} className="bg-background py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-7xl mx-auto">
        <FadeIn>
          <div className="mb-10 text-left rtl:text-right">
            <h1 className="text-4xl font-bold tracking-tight text-foreground mb-4">{t("title")}</h1>
            <p className="text-lg text-muted-foreground max-w-2xl">
              {t("subtitle")}
            </p>
          </div>
        </FadeIn>

        {/* Filter Bar */}
        <FadeIn delay={0.1}>
          <div className="flex flex-col md:flex-row gap-4 mb-10 items-center bg-card p-4 rounded-lg border border-border">
            <div className="relative w-full md:max-w-md">
              <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none rtl:right-0 rtl:pr-3">
                <Search className="h-5 w-5 text-muted-foreground" />
              </div>
              <input
                type="text"
                placeholder={t("search_bus")}
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="block w-full pl-10 rtl:pr-10 rtl:pl-3 bg-muted border border-border rounded-lg py-2.5 text-foreground placeholder-muted-foreground focus:border-primary focus:ring-primary sm:text-sm transition-colors"
              />
            </div>
            <div className="scrollbar-none flex w-full items-center gap-2 overflow-x-auto px-1 pb-2" aria-label={t("filter_governorate")}>
              {GOVERNORATES.map((city) => (
                <button
                  key={city.id}
                  type="button"
                  onClick={() => setGovernorate(city.id)}
                  className={`whitespace-nowrap rounded-lg px-4 py-2 text-sm font-semibold ${
                    governorate === city.id
                      ? "bg-[color:var(--brand-900)] text-white"
                      : "bg-muted text-foreground"
                  }`}
                >
                  {t(`gov_${city.id}`)}
                </button>
              ))}
            </div>
          </div>
        </FadeIn>

        {loading ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {[1, 2, 3].map(i => (
              <div key={i} className="h-80 bg-muted rounded-lg animate-pulse" />
            ))}
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {visible.length > 0 ? (
              visible.map((bus, index) => (
                <FadeIn key={bus.id} delay={0.1 + (index * 0.05)} fullWidth>
                  <BusCard bus={bus} />
                </FadeIn>
              ))
            ) : (
              <div className="col-span-full py-20 text-center rounded-lg border border-dashed border-border bg-card">
                <Bus className="w-12 h-12 text-primary/20 mx-auto mb-4" />
                <p className="text-xl font-medium text-muted-foreground">{t("empty_routes")}</p>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
