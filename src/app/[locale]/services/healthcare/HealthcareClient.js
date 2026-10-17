"use client";

import { useState } from "react";
import { useTranslations } from "next-intl";
import { useRouter } from "@/i18n/routing";
import { FadeIn } from "@/components/animations/FadeIn";
import {
  CalendarPlus,
  FileText,
  HeartPulse,
  ShieldCheck,
  AlertCircle,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import ProtectedAction from "@/components/auth/ProtectedAction";
import { SovereignConfirmModal } from "@/components/ui/SovereignConfirmModal";
import { submitServiceRequest } from "@/app/actions";
import { toast } from "sonner";

import Image from "next/image";
import { ModernTatreezAccent } from "@/components/ui/ModernTatreezAccent";

export function HealthcareClient({ insurance = null, records = [] }) {
  const t = useTranslations("Healthcare");
  const router = useRouter();
  const [renewOpen, setRenewOpen] = useState(false);
  const [renewing, setRenewing] = useState(false);
  const active = insurance?.status === "active";

  const confirmRenewal = async () => {
    setRenewing(true);
    const result = await submitServiceRequest("health_insurance_renewal", t("insurance_renew"));
    setRenewing(false);
    setRenewOpen(false);
    if (result?.success) toast.success(t("renew_sent"));
    else toast.error(result?.error || t("inactive"));
  };

  return (
    <div className="space-y-6">
      {/* Healthcare Civic Imagery Showcase */}
      <div className="relative h-44 sm:h-56 w-full rounded-2xl overflow-hidden border border-emerald-950/10 dark:border-white/10 shadow-sm">
        <Image
          src="/images/civic/medical-care.webp"
          alt="Palestine Healthcare Services"
          fill
          priority
          sizes="(max-width: 1024px) 100vw, 800px"
          className="object-cover"
        />
        <div className="absolute inset-0 bg-gradient-to-t from-background/90 via-background/25 to-transparent" />
        <div className="absolute bottom-4 start-5 end-5">
          <span className="text-xs font-bold text-primary block">وزارة الصحة الفلسطينية &bull; منظومة التأمين والسجلات الطبية</span>
          <p className="text-sm font-semibold text-foreground mt-0.5">
            رعاية صحية وطنية موثوقة لحماية كل أسرة فلسطينية
          </p>
        </div>
      </div>

      <ModernTatreezAccent variant="ribbon" className="opacity-15 dark:opacity-5" />

      <FadeIn className="mb-8 text-left rtl:text-right">
        <h1 className="text-3xl sm:text-4xl font-bold tracking-tight text-foreground mb-3">
          {t("title")}
        </h1>
        <p className="text-base sm:text-lg text-muted-foreground font-medium max-w-2xl leading-relaxed">
          {t("subtitle")}
        </p>
      </FadeIn>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <FadeIn delay={0.1}>
          <div className="bg-card p-8 rounded-lg shadow-sm border relative overflow-hidden h-full group text-left rtl:text-right border-border">
            <div className="w-14 h-14 bg-primary/10 rounded-md flex items-center justify-center mb-6">
              <HeartPulse className="w-7 h-7 text-primary" />
            </div>
            <h3 className="text-2xl font-bold text-foreground mb-3 tracking-tight">
              {t("insurance_title")}
            </h3>
            <p className="text-muted-foreground text-sm leading-relaxed mb-6">
              {t("insurance_desc")}
            </p>

            <div className="mb-6 p-4 rounded-md bg-black/5 dark:bg-white/5 flex items-center justify-between">
              <div className="flex items-center gap-2">
                {active ? (
                  <ShieldCheck className="w-5 h-5 text-green-500" />
                ) : (
                  <AlertCircle className="w-5 h-5 text-orange-500" />
                )}
                <span className="text-sm font-bold">
                  {active ? t("active") : t("inactive")}
                </span>
              </div>
              {insurance?.updated_at ? (
                <span className="text-[10px] text-muted-foreground uppercase tracking-widest">
                  {t("last_check")}: {new Date(insurance.updated_at).toLocaleDateString()}
                </span>
              ) : null}
            </div>

            <ProtectedAction className="block w-full" onAction={() => setRenewOpen(true)}>
              <Button
                type="button"
                variant="outline"
                className="w-full rounded-xl transition-applesque group-hover:bg-primary/5 cursor-pointer"
              >
                {t("insurance_renew")}
              </Button>
            </ProtectedAction>
          </div>
        </FadeIn>

        <FadeIn delay={0.2}>
          <div className="bg-card p-8 rounded-lg shadow-sm border relative overflow-hidden h-full group text-left rtl:text-right border-border">
            <div className="w-14 h-14 bg-blue-500/10 rounded-md flex items-center justify-center mb-6">
              <CalendarPlus className="w-7 h-7 text-blue-600 dark:text-blue-400" />
            </div>
            <h3 className="text-2xl font-bold text-foreground mb-3 tracking-tight">
              {t("clinic_title")}
            </h3>
            <p className="text-muted-foreground text-sm leading-relaxed mb-6">
              {t("clinic_desc")}
            </p>
            <ProtectedAction
              className="block w-full"
              onAction={() => router.push("/appointments?category=health")}
            >
              <Button
                type="button"
                className="w-full rounded-xl bg-blue-600 hover:bg-blue-700 shadow-md transition-applesque hover:-translate-y-0.5 font-semibold cursor-pointer"
              >
                {t("clinic_find")}
              </Button>
            </ProtectedAction>
          </div>
        </FadeIn>

        <FadeIn delay={0.3} fullWidth className="md:col-span-2">
          <div className="bg-card p-8 rounded-lg shadow-sm border flex flex-col md:flex-row items-center gap-8 group transition-shadow text-left rtl:text-right border-border">
            <div className="p-6 bg-black/5 dark:bg-white/5 rounded-lg">
              <FileText className="w-12 h-12 text-foreground" />
            </div>
            <div className="flex-1">
              <h3 className="text-2xl font-bold text-foreground mb-2 tracking-tight">
                {t("records_title")}
              </h3>
              <p className="text-muted-foreground text-sm leading-relaxed mb-4 md:mb-0">
                {t("records_desc")}
              </p>
              {records.length > 0 && (
                <div className="mt-4 flex gap-2 overflow-x-auto pb-2 scrollbar-hide">
                  {records.map((rec) => (
                    <div
                      key={rec.id}
                      className="px-3 py-1.5 rounded-lg bg-primary/5 border border-primary/10 text-[10px] font-bold whitespace-nowrap uppercase"
                    >
                      {rec.type}: {rec.status}
                    </div>
                  ))}
                </div>
              )}
            </div>
            <ProtectedAction
              className="w-full md:w-auto"
              onAction={() => router.push("/services/health-records")}
            >
              <Button
                type="button"
                variant="secondary"
                className="w-full md:w-auto rounded-xl px-8 font-bold text-sm h-12 cursor-pointer"
              >
                {t("records_access")}
              </Button>
            </ProtectedAction>
          </div>
        </FadeIn>
      </div>
    </div>
  );
}
