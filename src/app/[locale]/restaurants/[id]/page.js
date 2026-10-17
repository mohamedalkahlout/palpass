"use client";

import { useState, useEffect, use } from "react";
import { getRestaurantById } from "@/lib/supabase/service";
import { notFound } from "next/navigation";
import Image from "next/image";
import { civicImageSrc } from "@/lib/images/civic-image";
import { FadeIn } from "@/components/animations/FadeIn";
import { Button } from "@/components/ui/button";
import { Link } from "@/i18n/routing";
import { 
  MapPin, 
  PhoneCall, 
  FileText, 
  ChefHat, 
  ArrowLeft,
  Info
} from "lucide-react";
import { HeroSkeleton } from "@/components/ui/Skeleton";
import { useTranslations } from "next-intl";

export default function RestaurantDetailsPage(props) {
  const t = useTranslations("Restaurants");
  const params = use(props.params);
  const id = params?.id;
  
  const [restaurant, setRestaurant] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function load() {
      if (!id) return;
      const data = await getRestaurantById(id);
      if (!data) {
        setLoading(false);
        return;
      }
      setRestaurant({
        ...data,
        coverImage: data.image_url || null,
        logo: data.logo_url || null,
        foodImages: data.food_images || [],
        tags: data.tags || ["Verified", "Dining"],
        pdfMenuUrl: data.pdf_menu_url || "#"
      });
      setLoading(false);
    }
    load();
  }, [id]);

  if (loading) {
    return <div className="pt-20"><HeroSkeleton /></div>;
  }

  if (!restaurant) {
    return notFound();
  }

  return (
    <div className="bg-background pb-20">
      
      {/* Hero Cover (Parallax illusion) */}
      <div className="relative h-[400px] md:h-[500px] w-full border-b border-border">
        {civicImageSrc(restaurant.coverImage) ? (
          <Image
            src={civicImageSrc(restaurant.coverImage)}
            alt={restaurant.name}
            fill
            priority
            className="object-cover object-center"
          />
        ) : (
          <div className="absolute inset-0 bg-[color:var(--brand-900)]" />
        )}
        <div className="absolute inset-0 bg-black/40" />
        
        <div className="absolute top-6 start-4 z-20">
          <Link href="/restaurants">
            <Button variant="outline" size="icon" className="rounded-lg bg-black/40 border-white/20 text-white hover:bg-white/20 hover:text-white h-10 w-10">
              <ArrowLeft className="h-5 w-5 rtl:rotate-180" />
            </Button>
          </Link>
        </div>

        <div className="container mx-auto px-4 h-full relative z-10 flex flex-col justify-end pb-12">
           <FadeIn direction="up">
              <div className="flex flex-col md:flex-row gap-6 mt-auto max-w-5xl items-start md:items-end">
                 {/* Logo Component */}
                 <div className="w-24 h-24 md:w-32 md:h-32 rounded-lg overflow-hidden border-4 border-black/50 bg-card shrink-0 mt-8 mb-4 md:mb-0 relative">
                   {civicImageSrc(restaurant.logo) ? (
                     <Image
                       src={civicImageSrc(restaurant.logo)}
                       alt={restaurant.name}
                       fill
                       className="object-cover"
                     />
                   ) : (
                     <div className="absolute inset-0 bg-[color:var(--brand-900)]" />
                   )}
                 </div>
                 
                 <div className="flex-1 text-white text-shadow-sm">
                    <div className="flex flex-wrap gap-2 mb-3">
                      {restaurant.tags.map(tag => (
                        <span key={tag} className="text-xs font-bold uppercase tracking-widest bg-primary/20 border border-primary/30 text-primary-foreground px-3 py-1 rounded-full">
                          {tag}
                        </span>
                      ))}
                    </div>
                    <h1 className="text-4xl md:text-5xl font-bold tracking-tight mb-2 leading-tight">
                      {restaurant.name}
                    </h1>
                    <div className="flex items-center text-white/80 font-medium">
                      <MapPin className="w-5 h-5 mr-2 rtl:ml-2 rtl:mr-0 text-primary" />
                      {restaurant.city} Province
                    </div>
                 </div>
              </div>
           </FadeIn>
        </div>
      </div>

      <div className="container mx-auto px-4 max-w-5xl -mt-6 relative z-20">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 lg:gap-8">
          
          {/* Left Column: Details */}
          <div className="lg:col-span-2 space-y-6">
            <FadeIn delay={0.1}>
              <div className="rounded-lg border border-border bg-card p-8">
                <h3 className="text-xl font-bold mb-4 flex items-center gap-2 text-foreground">
                  <Info className="h-6 w-6 text-primary" /> About
                </h3>
                <p className="text-muted-foreground leading-relaxed text-lg font-medium">
                  {restaurant.description}
                </p>
              </div>
            </FadeIn>

            <FadeIn delay={0.2}>
              <div className="rounded-lg border border-border bg-card p-8">
                <h3 className="text-xl font-bold mb-6 flex items-center gap-2 text-foreground">
                  <ChefHat className="h-6 w-6 text-primary" /> Food Gallery
                </h3>
                {restaurant.foodImages.length > 0 ? (
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    {restaurant.foodImages.map((img, idx) => (
                      <div key={idx} className="relative h-64 rounded-lg overflow-hidden group">
                        {civicImageSrc(img) ? (
                          <Image
                            src={civicImageSrc(img)}
                            alt={`Food ${idx}`}
                            fill
                            className="object-cover transition-transform duration-500 group-hover:scale-110"
                          />
                        ) : (
                          <div className="absolute inset-0 bg-[color:var(--brand-900)]" />
                        )}
                        <div className="absolute inset-0 ring-1 ring-inset ring-black/10 dark:ring-white/10 rounded-lg pointer-events-none" />
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="text-muted-foreground">{t("no_gallery")}</p>
                )}
              </div>
            </FadeIn>
          </div>

          {/* Right Column: Actions */}
          <div className="lg:col-span-1 space-y-6">
            <FadeIn delay={0.3}>
              <div className="rounded-lg border border-border bg-card p-6 flex flex-col items-center text-center">
                 <div className="w-16 h-16 bg-green-100 dark:bg-green-900/30 text-green-600 dark:text-green-400 rounded-full flex items-center justify-center mb-4">
                   <PhoneCall className="w-8 h-8" />
                 </div>
                 <h4 className="text-lg font-bold text-foreground mb-1">{t("delivery")}</h4>
                 <p className="text-sm text-muted-foreground mb-6">{t("delivery_desc")}</p>
                 
                 <a href={`tel:${restaurant.phone}`} className="w-full">
                    <Button className="w-full text-lg h-14 rounded-lg font-bold bg-green-600 hover:bg-green-700 text-white transition-applesque hover:-translate-y-1">
                      <span dir="ltr">{restaurant.phone}</span>
                    </Button>
                 </a>
              </div>
            </FadeIn>

            <FadeIn delay={0.4}>
              <div className="rounded-lg border border-primary/10 bg-card p-6">
                 <h4 className="font-bold text-foreground mb-4 flex items-center gap-2">
                   <FileText className="h-5 w-5 text-primary" /> {t("view_menu")}
                 </h4>
                 <p className="text-sm text-muted-foreground mb-4 leading-relaxed">
                   {t("menu_desc")}
                 </p>
                 <a href={restaurant.pdfMenuUrl} target="_blank" rel="noreferrer" className="w-full">
                    <Button variant="outline" className="w-full h-12 rounded-xl font-semibold border-primary/20 hover:bg-primary/5 hover:text-primary transition-applesque">
                      {t("download_menu")}
                    </Button>
                 </a>
              </div>
            </FadeIn>
          </div>

        </div>
      </div>
    </div>
  );
}
