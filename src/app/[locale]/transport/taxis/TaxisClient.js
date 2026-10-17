"use client";

import { useMemo, useState } from "react";
import { FadeIn } from "@/components/animations/FadeIn";
import { TaxiCard } from "@/components/transport/TaxiCard";
import { Search, MapPin } from "lucide-react";
import { useLocale, useTranslations } from "next-intl";
import { GOVERNORATES, matchesGovernorate } from "@/lib/transport/governorates";

export function TaxisClient({ initialTaxis = [] }) {
  const t = useTranslations("Transport");
  const locale = useLocale();
  const [search, setSearch] = useState("");
  const [cityFilter, setCityFilter] = useState("all");

  const filteredTaxis = useMemo(() => {
    const q = search.trim().toLowerCase();
    return (initialTaxis || []).filter((taxi) => {
      const cityOk = matchesGovernorate(taxi.city, cityFilter);
      const nameOk = !q || String(taxi.name || "").toLowerCase().includes(q);
      return cityOk && nameOk;
    });
  }, [initialTaxis, search, cityFilter]);

  return (
    <div dir={locale === "ar" ? "rtl" : "ltr"} className="bg-background py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-7xl mx-auto">
        <FadeIn>
          <div className="mb-10 text-left rtl:text-right">
            <h1 className="text-4xl font-bold tracking-tight text-foreground mb-4">
              {t("taxi_title")}
            </h1>
            <p className="text-lg text-muted-foreground max-w-2xl">{t("taxi_subtitle")}</p>
          </div>
        </FadeIn>

        <FadeIn delay={0.1}>
          <div className="flex flex-col md:flex-row gap-4 mb-10 items-center justify-between bg-card p-4 rounded-lg border border-border">
            <div className="relative w-full md:max-w-md">
              <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none rtl:right-0 rtl:pr-3">
                <Search className="h-5 w-5 text-muted-foreground" />
              </div>
              <input
                type="text"
                placeholder={t("search_taxi")}
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
                  onClick={() => setCityFilter(city.id)}
                  className={`flex items-center gap-1.5 whitespace-nowrap rounded-lg px-4 py-2 text-sm font-semibold transition-all ${
                    cityFilter === city.id
                      ? "bg-primary text-primary-foreground"
                      : "bg-muted text-foreground hover:bg-muted/80"
                  }`}
                >
                  {city.id !== "all" && <MapPin className="h-3.5 w-3.5" />}
                  {t(`gov_${city.id}`)}
                </button>
              ))}
            </div>
          </div>
        </FadeIn>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {filteredTaxis.length > 0 ? (
            filteredTaxis.map((taxi, index) => (
              <FadeIn key={taxi.id} delay={0.1 + index * 0.05} fullWidth>
                <TaxiCard taxi={taxi} />
              </FadeIn>
            ))
          ) : (
            <div className="col-span-full py-20 text-center rounded-lg border border-dashed border-border bg-card">
              <MapPin className="w-12 h-12 text-primary/20 mx-auto mb-4" />
              <p className="text-xl font-medium text-muted-foreground">{t("no_taxis")}</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
