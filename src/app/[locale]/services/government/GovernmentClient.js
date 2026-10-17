"use client";

import { useState } from "react";
import { useTranslations } from "next-intl";
import { submitServiceRequest } from "@/app/actions";
import { toast } from "sonner";
import { FadeIn } from "@/components/animations/FadeIn";
import { Button } from "@/components/ui/button";
import { 
  Landmark, 
  ShieldCheck, 
  FileSignature, 
  Upload,
  Loader2,
} from "lucide-react";
import { OfficialCrest } from "@/components/brand/BrandMark";
import { useAccreditationGate } from "@/hooks/useAccreditationGate";
import { useAuthModal } from "@/context/AuthModalContext";
import { SovereignConfirmModal } from "@/components/ui/SovereignConfirmModal";

export function GovernmentClient() {
  const t = useTranslations("Services");
  const commonT = useTranslations("Common");
  const [activeServiceId, setActiveServiceId] = useState(null);
  const [confirmId, setConfirmId] = useState(null);
  const { ready, restricted } = useAccreditationGate();
  const { requireAuth } = useAuthModal();
  const confirmT = useTranslations("Confirm");
  const showRestriction = ready && restricted;
  const actionsLocked = restricted || activeServiceId !== null;

  const handleApply = async (serviceId) => {
    if (restricted) return;
    setActiveServiceId(serviceId);
    try {
      const result = await submitServiceRequest(serviceId);
      if (result.success) {
        toast.success(result.message);
      } else {
        toast.error(result.error || commonT("error"));
      }
    } finally {
      setActiveServiceId((current) => (current === serviceId ? null : current));
    }
  };

  return (
    <div className="space-y-6">
      <FadeIn>
        <div className="mb-12 text-center max-w-2xl mx-auto text-left rtl:text-right">
          <div className="flex justify-center mb-5">
            <OfficialCrest size={64} />
          </div>
          <h1 className="text-4xl font-bold tracking-tight text-foreground mb-4">{t("government")}</h1>
          <p className="text-lg text-muted-foreground font-medium">
            {t("government_desc")}
          </p>
          {showRestriction ? (
            <p className="mt-4 inline-flex rounded-full border border-amber-500/40 bg-amber-500/10 px-3 py-1 text-xs font-bold text-amber-800 dark:text-amber-200">
              {t("requires_accreditation")}
            </p>
          ) : null}
        </div>
      </FadeIn>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
          
        <FadeIn delay={0.1}>
          <div className="bg-card p-8 rounded-lg h-full shadow-sm transition-all border relative overflow-hidden group flex flex-col text-left rtl:text-right border-border">
            <div className="absolute top-0 right-0 w-32 h-32 bg-primary/10 rounded-full blur-2xl -mr-10 -mt-10 group-hover:bg-primary/20 transition-colors" />
            <Landmark className="w-12 h-12 text-primary mb-6 relative z-10" />
            <h3 className="text-2xl font-bold text-foreground mb-3 tracking-tight">{t("passport_renewal_title")}</h3>
            <p className="text-muted-foreground text-sm leading-relaxed mb-4 flex-1">
              {t("passport_renewal_desc")}
            </p>
            <ul className="mb-6 space-y-1.5 text-xs font-medium leading-relaxed text-foreground">
              <li>{t("passport_authority")}</li>
              <li>{t("passport_fee_regular")}</li>
              <li>{t("passport_fee_urgent")}</li>
              <li>{t("passport_stamp")}</li>
              <li>{t("passport_delivery")}</li>
            </ul>
            <Button 
              variant="default" 
              onClick={() => requireAuth(() => setConfirmId("passport"))}
              disabled={actionsLocked}
              className="w-full rounded-xl mt-auto relative z-10 shadow-primary/20 cursor-pointer"
            >
              {activeServiceId === "passport" ? (
                <span className="inline-flex items-center gap-2">
                  <Loader2 className="h-4 w-4 animate-spin" />
                  {t("processing")}
                </span>
              ) : commonT("submit")}
            </Button>
          </div>
        </FadeIn>

        <FadeIn delay={0.2}>
          <div className="bg-card p-8 rounded-lg h-full shadow-sm transition-all border relative overflow-hidden group flex flex-col text-left rtl:text-right border-border">
            <div className="absolute top-0 right-0 w-32 h-32 bg-primary/10 rounded-full blur-2xl -mr-10 -mt-10 group-hover:bg-primary/20 transition-colors" />
            <ShieldCheck className="w-12 h-12 text-primary mb-6 relative z-10" />
            <h3 className="text-2xl font-bold text-foreground mb-3 tracking-tight">{t("id_validation_title")}</h3>
            <p className="text-muted-foreground text-sm leading-relaxed mb-6 flex-1">
              {t("id_validation_desc")}
            </p>
            <Button 
              variant="outline" 
              onClick={() => requireAuth(() => setConfirmId("id_validation"))}
              disabled={actionsLocked}
              className="w-full rounded-xl mt-auto relative z-10 border-primary text-primary hover:bg-primary/10 font-bold cursor-pointer"
            >
              {activeServiceId === "id_validation" ? (
                <span className="inline-flex items-center gap-2">
                  <Loader2 className="h-4 w-4 animate-spin" />
                  {t("processing")}
                </span>
              ) : t("id_generate")}
            </Button>
          </div>
        </FadeIn>

        <FadeIn delay={0.3}>
          <div className="bg-card p-8 rounded-lg h-full shadow-sm transition-all border relative overflow-hidden group flex flex-col text-left rtl:text-right border-border">
            <div className="absolute top-0 right-0 w-32 h-32 bg-primary/10 rounded-full blur-2xl -mr-10 -mt-10 group-hover:bg-primary/20 transition-colors" />
            <FileSignature className="w-12 h-12 text-primary mb-6 relative z-10" />
            <h3 className="text-2xl font-bold text-foreground mb-3 tracking-tight">{t("land_registry_title")}</h3>
            <p className="text-muted-foreground text-sm leading-relaxed mb-4 flex-1">
              {t("land_registry_desc")}
            </p>
            <ul className="mb-6 space-y-1.5 text-xs font-medium leading-relaxed text-foreground">
              <li>{t("land_block")}</li>
              <li>{t("land_parcel")}</li>
              <li>{t("land_locality")}</li>
              <li>{t("land_tenure")}</li>
              <li>{t("land_fee")}</li>
            </ul>
            <Button 
              variant="secondary" 
              onClick={() => requireAuth(() => setConfirmId("land_doc"))}
              disabled={actionsLocked}
              className="w-full rounded-xl mt-auto relative z-10 font-bold transition-applesque cursor-pointer"
            >
              {activeServiceId === "land_doc" ? (
                <span className="inline-flex items-center gap-2">
                  <Loader2 className="h-4 w-4 animate-spin" />
                  {t("processing")}
                </span>
              ) : (
                <span className="inline-flex items-center gap-2">
                  {commonT("submit")} <Upload className="h-4 w-4" />
                </span>
              )}
            </Button>
          </div>
        </FadeIn>

      </div>
    </div>
  );
}
