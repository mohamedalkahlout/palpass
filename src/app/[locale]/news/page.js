"use client";

import { useState, useEffect } from "react";
import { useTranslations, useLocale } from "next-intl";
import { FadeIn } from "@/components/animations/FadeIn";
import Image from "next/image";
import { civicImageSrc } from "@/lib/images/civic-image";
import { Clock, Tag, User, MapPin, ChevronRight, Share2 } from "lucide-react";
import { getNews } from "@/lib/supabase/service";
import { GridCardSkeleton } from "@/components/ui/Skeleton";

export default function NewsPage() {
  const t = useTranslations("News");
  const commonT = useTranslations("Common");
  const locale = useLocale();

  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function load() {
      setLoading(true);
      const data = await getNews();
      setItems(data);
      setLoading(false);
    }
    load();
  }, []);

  return (
    <div className="bg-background py-16 px-4 sm:px-6 lg:px-8">
      <div className="max-w-7xl mx-auto text-left rtl:text-right">
        <FadeIn className="mb-12">
          <h1 className="text-4xl md:text-5xl font-bold tracking-tight text-foreground mb-4 drop-shadow-sm">
            {t("title")}
          </h1>
          <p className="text-lg text-muted-foreground font-medium max-w-2xl leading-relaxed">
            {t("subtitle")}
          </p>
        </FadeIn>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
          {loading ? (
             <div className="col-span-full">
               <GridCardSkeleton count={6} />
             </div>
          ) : items.length > 0 ? (
            items.map((item, idx) => (
              <FadeIn key={item.id} delay={idx * 0.1}>
                <div className="rounded-lg overflow-hidden transition-all duration-500 border border-border flex flex-col h-full bg-card group relative hover:-translate-y-1">
                  <div className="absolute top-4 start-4 z-10">
                    <span className="bg-card/95 px-3 py-1 rounded-full text-[10px] uppercase tracking-widest font-black text-foreground border border-border flex items-center">
                      <Tag className="w-3 h-3 mr-1 rtl:ml-1 rtl:mr-0 text-primary" /> {item.category}
                    </span>
                  </div>
                  
                  <div className="relative h-56 w-full overflow-hidden shrink-0">
                    {civicImageSrc(item.image_url) ? (
                      <Image
                        src={civicImageSrc(item.image_url)}
                        alt={item.title}
                        fill
                        className="object-cover transition-transform duration-700 group-hover:scale-105"
                      />
                    ) : (
                      <div className="absolute inset-0 bg-[color:var(--brand-900)]" />
                    )}
                    <div className="absolute inset-0 bg-black/30" />
                  </div>

                  <div className="p-6 flex flex-col flex-1">
                    <h3 className="text-xl font-bold text-foreground line-clamp-2 mb-3 leading-tight group-hover:text-primary transition-colors">
                      {item.title}
                    </h3>
                    <p className="text-sm text-muted-foreground line-clamp-3 leading-relaxed mb-6 flex-1 font-medium">
                      {item.excerpt}
                    </p>
                    
                    <div className="mt-auto pt-4 border-t border-border flex items-center justify-between">
                       <div className="flex items-center gap-3">
                          <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center shrink-0 border border-primary/20 overflow-hidden">
                            {civicImageSrc(item.profiles?.avatar_url) ? (
                              <Image src={civicImageSrc(item.profiles.avatar_url)} alt={item.profiles.full_name} width={32} height={32} className="object-cover" />
                            ) : (
                              <User className="w-4 h-4 text-primary" />
                            )}
                          </div>
                          <div className="flex flex-col">
                            <span className="text-[11px] font-bold text-foreground">
                              {item.profiles?.full_name || item.source_label || "Admin"}
                            </span>
                            <span className="text-[9px] text-muted-foreground uppercase">{t("source")}</span>
                          </div>
                       </div>
                       <div className="flex items-center text-[10px] text-muted-foreground font-bold uppercase tracking-wider">
                          <Clock className="w-3 h-3 mr-1 rtl:ml-1 rtl:mr-0" /> {new Date(item.created_at).toLocaleDateString()}
                       </div>
                    </div>
                  </div>
                </div>
              </FadeIn>
            ))
          ) : (
            <div className="col-span-full py-20 text-center rounded-lg border border-dashed border-border bg-card mt-8">
              <Clock className="w-16 h-16 text-muted-foreground/30 mx-auto mb-4" />
              <p className="text-xl font-bold text-foreground">{commonT("no_results")}</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
