"use client";

import Image from "next/image";
import { civicImageSrc } from "@/lib/images/civic-image";
import { useTranslations } from "next-intl";
import { Clock, Route, Users } from "lucide-react";
import { useAuthModal } from "@/context/AuthModalContext";
import { Button } from "@/components/ui/button";
import { governorateId } from "@/lib/transport/governorates";

function scheduleText(schedule) {
  if (!schedule) return "—";
  if (typeof schedule === "string") return schedule;
  if (Array.isArray(schedule)) return schedule.map(String).join(" · ");
  return "—";
}

export function BusCard({ bus }) {
  const t = useTranslations("Transport");
  const { requireAuth } = useAuthModal();
  const busNumber = bus.bus_number || bus.number;
  const place = (value) => {
    const id = governorateId(value);
    return id ? t(`gov_${id}`) : value;
  };
  const fromLabel = place(bus.from_city);
  const toLabel = place(bus.to_city);
  const routeName = (fromLabel && toLabel) ? `${fromLabel} ↔ ${toLabel}` : bus.route;
  const schedule = bus.schedule_info || bus.schedule;
  const driverName = bus.driver_name || bus.driver?.name;
  const busImage = civicImageSrc(bus.bus_image_url || bus.busImage);
  const driverImage = civicImageSrc(bus.driver_avatar_url || bus.driver?.image);

  return (
    <div className="group relative flex h-full flex-col overflow-hidden rounded-lg border border-border bg-card transition-all duration-300">
      <div className="absolute top-4 right-4 z-10 flex items-center gap-1 rounded-full border border-primary-foreground/20 bg-primary px-3 py-1 text-sm font-bold text-primary-foreground shadow-sm">
        <Route className="h-4 w-4" /> {t("route_badge")} {busNumber}
      </div>
      
      <div className="relative h-48 w-full overflow-hidden shrink-0">
        {busImage ? (
          <Image 
            src={busImage} 
            alt={routeName} 
            fill 
            className="object-cover transition-transform duration-700 group-hover:scale-110"
          />
        ) : (
          <div className="absolute inset-0 bg-primary" />
        )}
        <div className="absolute inset-0 bg-black/40" />
        <div className="absolute bottom-4 left-4 right-4 text-start">
          <h3 className="text-lg md:text-xl font-bold text-white tracking-tight leading-tight">{routeName}</h3>
        </div>
      </div>
      
      <div className="p-5 flex flex-col flex-1 gap-4">
        <div className="flex items-start gap-3 rounded-lg border border-border bg-muted/50 p-3">
          <Clock className="w-5 h-5 text-primary shrink-0 mt-0.5" />
          <div className="text-start">
            <p className="mb-1 text-xs font-medium text-muted-foreground">{t("schedule")}</p>
            <p className="text-sm font-semibold text-foreground">{scheduleText(schedule)}</p>
          </div>
        </div>
        
        <dl className="grid grid-cols-2 gap-3 text-start text-sm">
          <div>
            <dt className="text-xs text-muted-foreground">{t("departure")}</dt>
            <dd className="font-semibold text-foreground">{fromLabel || "—"}</dd>
          </div>
          <div>
            <dt className="text-xs text-muted-foreground">{t("destination")}</dt>
            <dd className="font-semibold text-foreground">{toLabel || "—"}</dd>
          </div>
          <div>
            <dt className="text-xs text-muted-foreground">{t("fare")}</dt>
            <dd className="font-semibold text-foreground" dir="ltr">
              {bus.fare != null ? `${bus.fare} ${t("ils")}` : "—"}
            </dd>
          </div>
          <div>
            <dt className="text-xs text-muted-foreground">{t("frequency")}</dt>
            <dd className="font-semibold text-foreground">{bus.frequency || scheduleText(schedule)}</dd>
          </div>
          <div>
            <dt className="inline-flex items-center gap-1 text-xs text-muted-foreground">
              <Users className="h-3.5 w-3.5" /> {t("capacity")}
            </dt>
            <dd className="font-semibold text-foreground">{bus.capacity ?? "—"}</dd>
          </div>
          <div>
            <dt className="text-xs text-muted-foreground">{t("operator")}</dt>
            <dd className="font-semibold text-foreground">{bus.operator || bus.operator_name || "—"}</dd>
          </div>
        </dl>

        <div className="mt-auto flex items-center gap-3 pt-2">
          <div className="relative w-10 h-10 rounded-full overflow-hidden border-2 border-primary/20 bg-muted shrink-0">
            {driverImage ? (
              <Image 
                src={driverImage} 
                alt={driverName} 
                fill 
                className="object-cover"
              />
            ) : (
              <div className="flex h-full w-full items-center justify-center bg-primary text-xs font-bold text-primary-foreground">PS</div>
            )}
          </div>
          <div className="min-w-0 flex-1 text-start">
            <p className="text-xs font-medium text-muted-foreground">{t("driver")}</p>
            <p className="truncate text-sm font-semibold text-foreground">{driverName}</p>
          </div>
          <Button
            type="button"
            size="sm"
            className="shrink-0 rounded-full"
            onClick={() => requireAuth(() => {})}
          >
            {t("prefer_line")}
          </Button>
        </div>
      </div>
    </div>
  );
}
