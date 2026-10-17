"use client";

import Image from "next/image";
import { civicImageSrc } from "@/lib/images/civic-image";
import { MapPin, Phone, ChefHat } from "lucide-react";
import { Link } from "@/i18n/routing";

export function RestaurantCard({ restaurant }) {
  const cover = civicImageSrc(restaurant.coverImage || restaurant.image);
  const logo = civicImageSrc(restaurant.logo || restaurant.logo_url);
  return (
    <Link href={`/restaurants/${restaurant.id}`} className="group block h-full">
      <div className="flex h-full flex-col overflow-hidden rounded-lg border border-border bg-card transition-all duration-500 hover:-translate-y-1">
        {/* Cover Image */}
        <div className="relative h-48 w-full overflow-hidden shrink-0">
          {cover ? (
            <Image
              src={cover}
              alt={restaurant.name}
              fill
              className="object-cover transition-transform duration-700 group-hover:scale-105"
            />
          ) : (
            <div className="absolute inset-0 bg-primary" />
          )}
          <div className="absolute inset-0 bg-black/40" />
          
          {/* Tags */}
          <div className="absolute top-4 right-4 flex gap-2">
             <div className="flex items-center rounded-full border border-white/20 bg-black/35 px-2.5 py-1 text-xs font-semibold text-white">
               <MapPin className="w-3 h-3 mr-1 rtl:ml-1 rtl:mr-0" /> {restaurant.city}
             </div>
          </div>
        </div>
        
        <div className="p-5 pt-0 flex flex-col flex-1 relative">
          {/* Logo / Avatar overlapping the cover */}
          <div className="relative -mt-8 mb-3 h-16 w-16 overflow-hidden rounded-lg border-4 border-card bg-muted">
             {logo ? (
               <Image
                 src={logo}
                 alt={`${restaurant.name} logo`}
                 fill
                 className="object-cover"
               />
             ) : (
               <div className="absolute inset-0 bg-primary" />
             )}
          </div>
          
          <h3 className="text-xl font-bold text-foreground tracking-tight leading-tight mb-2 group-hover:text-primary transition-colors">
            {restaurant.name}
          </h3>
          <p className="text-sm text-muted-foreground line-clamp-2 leading-relaxed flex-1">
            {restaurant.description}
          </p>
          
          <div className="mt-4 pt-4 border-t border-border flex items-center justify-between">
            <div className="flex flex-wrap gap-2">
               {restaurant.tags.map((tag, i) => (
                  <span key={i} className="text-[10px] uppercase tracking-wider font-semibold text-primary bg-primary/10 px-2 py-1 rounded-full">
                     {tag}
                  </span>
               ))}
            </div>
          </div>
        </div>
      </div>
    </Link>
  );
}
