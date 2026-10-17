"use client";

import { useState, useEffect } from "react";
import { useTranslations, useLocale } from "next-intl";
import { FadeIn } from "@/components/animations/FadeIn";
import { PackageOpen, CheckCircle, Info, Loader2, AlertCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/components/auth/AuthProvider";
import { getAidPackages, getUserAidClaims } from "@/lib/supabase/service";
import { claimAidPackage } from "@/app/actions";
import { useAccreditationGate } from "@/hooks/useAccreditationGate";
import Image from "next/image";
import { ModernTatreezAccent } from "@/components/ui/ModernTatreezAccent";
import ProtectedAction from "@/components/auth/ProtectedAction";
import { toast } from "sonner";

export function AidClient() {
  const t = useTranslations("Aid");
  const servicesT = useTranslations("Services");
  const commonT = useTranslations("Common");
  const locale = useLocale();
  
  const { user } = useAuth();
  const [packages, setPackages] = useState([]);
  const [claims, setClaims] = useState([]);
  const [loading, setLoading] = useState(true);
  const [claiming, setClaiming] = useState(null);
  const { ready, restricted } = useAccreditationGate();
  const showRestriction = ready && restricted;

  useEffect(() => {
    async function load() {
      setLoading(true);
      const pkgs = await getAidPackages();
      setPackages(pkgs || []);
      if (user) {
        const userClaims = await getUserAidClaims(user.id);
        setClaims(userClaims || []);
      } else {
        setClaims([]);
      }
      setLoading(false);
    }
    load();
  }, [user]);

  const handleClaim = async (packageId) => {
    if (restricted) return;
    setClaiming(packageId);
    const result = await claimAidPackage(packageId);
    if (result.success) {
      toast.success(result.message);
      // Refresh claims
      const userClaims = await getUserAidClaims(user.id);
      setClaims(userClaims || []);
    } else {
      toast.error(result.error);
    }
    setClaiming(null);
  };

  const isClaimed = (packageId) => claims.some(c => c.package_id === packageId);

  return (
    <div className="space-y-6">
      {/* Aid & Community Solidarity Showcase Banner */}
      <div className="relative h-44 sm:h-56 w-full rounded-2xl overflow-hidden border border-emerald-950/10 dark:border-white/10 shadow-sm">
        <Image
          src="/images/civic/community-solidarity.webp"
          alt="Palestine Community Solidarity"
          fill
          priority
          sizes="(max-width: 1024px) 100vw, 800px"
          className="object-cover"
        />
        <div className="absolute inset-0 bg-gradient-to-t from-background/90 via-background/25 to-transparent" />
        <div className="absolute bottom-4 start-5 end-5">
          <span className="text-xs font-bold text-primary block">وزارة التنمية الاجتماعية &bull; شبكة التكافل والدعم الوطني</span>
          <p className="text-sm font-semibold text-foreground mt-0.5">
            تنسيق وإيصال حزم الإغاثة والمساعدات الوطنية بكرامة وشفافية
          </p>
        </div>
      </div>

      <ModernTatreezAccent variant="ribbon" className="opacity-15 dark:opacity-5" />

      <FadeIn className="mb-10 text-left rtl:text-right">
        <h1 className="text-4xl md:text-5xl font-bold tracking-tight text-foreground mb-4">
          {t("title")}
        </h1>
        <p className="text-lg text-muted-foreground font-medium max-w-2xl leading-relaxed">
          {t("subtitle")}
        </p>
        {showRestriction ? (
          <p className="mt-4 inline-flex rounded-full border border-amber-500/40 bg-amber-500/10 px-3 py-1 text-xs font-bold text-amber-800 dark:text-amber-200">
            {servicesT("requires_accreditation")}
          </p>
        ) : null}
      </FadeIn>

      <FadeIn delay={0.1}>
        <div className="bg-card rounded-lg p-6 mb-8 flex items-start gap-4 shadow-sm border border-blue-500/20 bg-blue-500/5 transition-all hover:bg-blue-500/10 dark:hover:bg-blue-500/15">
          <Info className="w-6 h-6 text-blue-600 dark:text-blue-400 shrink-0 mt-1" />
          <div className="text-left rtl:text-right">
            <h4 className="font-bold text-foreground">{t("eligibility_title")}</h4>
            <p className="text-sm text-foreground/80 mt-1">{t("eligibility_desc")}</p>
          </div>
        </div>
      </FadeIn>

      <div className="space-y-4">
        {loading ? (
           <div className="space-y-4">
             {[1, 2, 3].map(i => (
               <div key={i} className="bg-card p-8 rounded-lg h-32 animate-pulse bg-black/5 dark:bg-white/5 border border-border" />
             ))}
           </div>
        ) : packages.length > 0 ? (
          packages.map((pkg, i) => {
            const claimed = isClaimed(pkg.id);
            return (
              <FadeIn key={pkg.id} delay={0.1 * i}>
                <div className="bg-card p-6 rounded-lg flex flex-col md:flex-row items-center justify-between gap-6 shadow-sm border transition-all hover:bg-black/[0.02] dark:hover:bg-white/[0.02] hover:border-primary/20 bg-card border-border">
                  <div className="flex items-center gap-5 w-full">
                    <div className={`w-14 h-14 rounded-md flex items-center justify-center shrink-0 shadow-inner ${!claimed ? 'bg-primary/20 text-primary' : 'bg-muted text-muted-foreground'}`}>
                      {!claimed ? <PackageOpen className="w-7 h-7"/> : <CheckCircle className="w-7 h-7"/>}
                    </div>
                    <div className="text-left rtl:text-right flex-1">
                      <h3 className="text-xl font-bold text-foreground tracking-tight">{pkg.name}</h3>
                      <p className="text-sm text-muted-foreground mt-1 line-clamp-1 font-medium">{pkg.description}</p>
                      <div className="flex items-center gap-3 mt-3">
                        <span className="text-[10px] font-black px-2.5 py-1 rounded-full bg-primary/10 text-primary uppercase tracking-widest border border-primary/20">
                          {t("active")}
                        </span>
                        <span className="text-[10px] text-muted-foreground font-bold uppercase tracking-wider">{new Date(pkg.created_at).toLocaleDateString()}</span>
                      </div>
                    </div>
                  </div>

                  <div className="w-full md:w-auto border-t md:border-t-0 border-border pt-4 md:pt-0">
                     {!claimed ? (
                       <ProtectedAction className="w-full md:w-auto" onAction={() => handleClaim(pkg.id)}>
                         <Button
                           type="button"
                           disabled={restricted || claiming === pkg.id}
                           title={restricted ? servicesT("requires_accreditation") : undefined}
                           className="w-full md:w-auto rounded-md hover:shadow-primary/20 hover:-translate-y-0.5 transition-applesque font-bold min-w-[160px] h-12 cursor-pointer"
                         >
                           {claiming === pkg.id ? <Loader2 className="w-5 h-5 animate-spin" /> : t("claim")}
                         </Button>
                       </ProtectedAction>
                     ) : (
                       <div className="flex items-center gap-2 text-green-600 dark:text-green-400 font-black text-sm px-6 py-3 bg-green-500/10 rounded-md border border-green-500/20">
                          <CheckCircle className="w-5 h-5" /> {t("claimed")}
                       </div>
                     )}
                  </div>
                </div>
              </FadeIn>
            );
          })
        ) : (
          <div className="py-32 text-center bg-card rounded-lg border border-dashed border-border mt-8 flex flex-col items-center">
            <PackageOpen className="w-16 h-16 text-muted-foreground/20 mb-4" />
            <p className="text-xl font-bold text-foreground">{t("no_packages")}</p>
            <p className="text-muted-foreground mt-2 max-w-sm mx-auto">{commonT("no_results")}</p>
          </div>
        )}
      </div>
    </div>
  );
}
