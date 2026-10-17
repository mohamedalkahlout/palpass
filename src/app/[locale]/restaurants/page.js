"use client";

import { useState, useEffect } from "react";
import { useTranslations, useLocale } from "next-intl";
import { FadeIn } from "@/components/animations/FadeIn";
import { 
  UtensilsCrossed, 
  Search, 
  MapPin, 
  BadgePlus, 
  Star, 
  ChevronRight,
  TrendingUp,
  Store,
  Map
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { getRestaurants } from "@/lib/supabase/service";
import { GridCardSkeleton } from "@/components/ui/Skeleton";
import { RestaurantCard } from "@/components/restaurants/RestaurantCard";
import { RestaurantFormModal } from "@/components/restaurants/RestaurantFormModal";

export default function RestaurantsPage() {
  const t = useTranslations("Services");
  const commonT = useTranslations("Common");
  const locale = useLocale();
  
  const [search, setSearch] = useState("");
  const [cityFilter, setCityFilter] = useState("All");
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function load() {
      setLoading(true);
      const data = await getRestaurants();
      setItems(data);
      setLoading(false);
    }
    load();
  }, []);

  const cities = ["All", ...Array.from(new Set(items.map(r => r.city)))];

  const filteredItems = items.filter(r => {
    const matchesSearch = r.name.toLowerCase().includes(search.toLowerCase()) || 
                          (r.description && r.description.toLowerCase().includes(search.toLowerCase()));
    const matchesCity = cityFilter === "All" || r.city === cityFilter;
    return matchesSearch && matchesCity;
  });

  return (
    <div className="bg-background py-16 px-4 sm:px-6 lg:px-8">
      <div className="max-w-7xl mx-auto">
        
        {/* Header & Submit Action */}
        <FadeIn>
          <div className="flex flex-col lg:flex-row justify-between items-start lg:items-end mb-12 gap-6 text-left rtl:text-right">
            <div>
              <div className="inline-flex items-center rounded-full bg-primary/10 px-3 py-1 text-sm font-semibold text-primary mb-4 border border-primary/20">
                <UtensilsCrossed className="w-4 h-4 mr-2 rtl:ml-2 rtl:mr-0" />
                {t("restaurants")}
              </div>
              <h1 className="text-4xl md:text-5xl font-bold tracking-tight text-foreground mb-4 drop-shadow-sm">
                {t("restaurants")}
              </h1>
              <p className="text-lg text-muted-foreground font-medium max-w-2xl leading-relaxed">
                {t("restaurants_desc")}
              </p>
            </div>
            
            <Button 
               onClick={() => setIsModalOpen(true)}
               className="rounded-lg px-6 py-6 font-semibold transition-applesque flex items-center gap-2 group w-full sm:w-auto cursor-pointer"
            >
              <BadgePlus className="w-5 h-5 group-hover:rotate-90 transition-transform duration-300" />
              {commonT("submit")}
            </Button>
          </div>
        </FadeIn>

        {/* Filter Bar */}
        <FadeIn delay={0.1}>
          <div className="flex flex-col md:flex-row gap-4 mb-10 items-center justify-between bg-card p-4 rounded-lg border border-border">
            <div className="relative w-full md:w-96">
              <div className="absolute inset-y-0 start-0 ps-4 flex items-center pointer-events-none">
                <Search className="h-5 w-5 text-muted-foreground" />
              </div>
              <input
                type="text"
                placeholder={commonT("search")}
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="block w-full ps-11 pe-4 bg-muted border border-border rounded-lg py-3 text-foreground placeholder-muted-foreground focus:border-primary focus:ring-1 focus:ring-primary transition-all font-medium"
              />
            </div>

            <div className="flex gap-2 w-full md:w-auto overflow-x-auto pb-2 md:pb-0 scrollbar-hide">
              {cities.map((city) => (
                <button
                  key={city}
                  onClick={() => setCityFilter(city)}
                  className={`px-5 py-2.5 rounded-lg text-sm font-bold transition-all whitespace-nowrap flex items-center gap-2 hover:-translate-y-0.5 cursor-pointer ${
                    cityFilter === city 
                      ? "bg-foreground text-background border border-transparent" 
                      : "bg-muted text-foreground hover:bg-muted/80 border border-border"
                  }`}
                >
                  {city !== "All" && <MapPin className="w-4 h-4" />}
                  {city === "All" ? commonT("all") : city}
                </button>
              ))}
            </div>
          </div>
        </FadeIn>

        {/* Restaurant Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 xl:gap-8">
          {loading ? (
             <div className="col-span-full">
               <GridCardSkeleton count={6} />
             </div>
          ) : filteredItems.length > 0 ? (
            filteredItems.map((restaurant, index) => (
              <FadeIn key={restaurant.id} delay={0.1 + (index * 0.05)} fullWidth>
                <RestaurantCard restaurant={{
                  ...restaurant,
                  tags: restaurant.tags || ['Verified'],
                  rating: restaurant.rating || 4.8,
                  image: restaurant.image_url || null
                }} />
              </FadeIn>
            ))
          ) : (
            <div className="col-span-full py-32 text-center rounded-lg border border-dashed border-border bg-card mt-8">
              <UtensilsCrossed className="w-16 h-16 text-muted-foreground/30 mx-auto mb-4" />
              <p className="text-xl font-bold text-foreground">{commonT("no_results")}</p>
            </div>
          )}
        </div>
      </div>

      {isModalOpen && (
        <RestaurantFormModal 
          isOpen={isModalOpen} 
          onClose={() => setIsModalOpen(false)} 
        />
      )}
    </div>
  );
}
