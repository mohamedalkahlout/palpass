"use client";

import Image from "next/image";
import { civicImageSrc } from "@/lib/images/civic-image";
import { useTranslations } from "next-intl";
import { MapPin, Phone } from "lucide-react";
import { governorateId } from "@/lib/transport/governorates";
import ProtectedAction from "@/components/auth/ProtectedAction";

export function TaxiCard({ taxi }) {
  const t = useTranslations("Transport");
  const cityKey = governorateId(taxi.city);
  const imageUrl = civicImageSrc(taxi.image_url || taxi.image);

  return (
    <div className="group flex h-full flex-col overflow-hidden rounded-lg border border-border bg-card transition-all duration-300">
      <div className="relative h-48 w-full overflow-hidden">
        {imageUrl ? (
          <Image 
            src={imageUrl} 
            alt={taxi.name} 
            fill 
            className="object-cover transition-transform duration-700 group-hover:scale-110"
          />
        ) : (
          <div className="absolute inset-0 bg-primary" />
        )}
        <div className="absolute inset-0 bg-black/40" />
        <div className="absolute bottom-4 left-4 right-4 text-start">
          <div className="inline-flex items-center rounded-full border border-white/20 bg-black/35 px-2.5 py-1 text-xs font-semibold text-white mb-2">
            <MapPin className="me-1 h-3 w-3" /> {cityKey ? t(`gov_${cityKey}`) : taxi.city}
          </div>
          <h3 className="text-xl font-bold text-white tracking-tight leading-tight">{taxi.name}</h3>
        </div>
      </div>
      <div className="p-5 flex flex-col flex-1">
        <p className="text-sm text-muted-foreground flex-1 line-clamp-2 leading-relaxed mb-4">
          {taxi.description}
        </p>
        <div className="mt-auto pt-4 border-t border-border flex items-center justify-between">
          <div className="flex items-center text-sm font-medium text-foreground">
            <Phone className="w-4 h-4 mr-2 rtl:ml-2 rtl:mr-0 text-primary" />
            <span dir="ltr">{taxi.phone}</span>
          </div>
          <ProtectedAction
            className="inline-flex"
            onAction={() => {
              window.location.href = `tel:${taxi.phone}`;
            }}
          >
            <span className="cursor-pointer rounded-full bg-primary/10 px-4 py-1.5 text-sm font-semibold text-primary transition-all hover:bg-primary hover:text-primary-foreground">
              {t("call")}
            </span>
          </ProtectedAction>
        </div>
      </div>
    </div>
  );
}
