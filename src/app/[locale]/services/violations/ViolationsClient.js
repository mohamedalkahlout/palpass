"use client";

import { useState, useEffect } from "react";
import { FadeIn } from "@/components/animations/FadeIn";
import { AlertTriangle, Car, FileWarning, CheckCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/components/auth/AuthProvider";
import { useAuthModal } from "@/context/AuthModalContext";
import { SovereignConfirmModal } from "@/components/ui/SovereignConfirmModal";
import { getViolations } from "@/lib/supabase/service";
import { payViolation } from "@/app/actions";
import { notifyWalletUpdated } from "@/lib/wallet-events";
import { TableRowSkeleton } from "@/components/ui/Skeleton";
import { useTranslations } from "next-intl";
import { useAccreditationGate } from "@/hooks/useAccreditationGate";
import { toast } from "sonner";

export function ViolationsClient() {
  const t = useTranslations("Services");
  const commonT = useTranslations("Common");
  const { user, loading: authLoading } = useAuth();
  const { requireAuth } = useAuthModal();
  const confirmT = useTranslations("Confirm");
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [paying, setPaying] = useState(null);
  const [pendingFine, setPendingFine] = useState(null);
  const { ready, restricted } = useAccreditationGate();
  const showRestriction = ready && restricted;

  useEffect(() => {
    async function load() {
      if (authLoading) return;
      if (!user) {
        setItems([]);
        setLoading(false);
        return;
      }
      setLoading(true);
      const data = await getViolations(user.id);
      setItems(data || []);
      setLoading(false);
    }
    load();
  }, [user, authLoading]);

  const handlePay = async (violation) => {
    if (restricted || violation.status === "paid") return;
    setPaying(violation.id);
    const result = await payViolation(violation.id);
    if (result.error) {
      toast.error(result.error);
    } else {
      setItems(prev => prev.map(v => v.id === violation.id ? { ...v, status: 'paid' } : v));
      notifyWalletUpdated(result.newBalance);
      toast.success(t("settled"));
    }
    setPaying(null);
  };

  return (
    <div className="space-y-6">
      {showRestriction ? (
        <p className="mb-6 rounded-lg border border-[color:var(--warning)]/40 bg-[color:var(--warning)]/10 px-3 py-2 text-sm font-semibold text-foreground">
          {t("requires_accreditation")}
        </p>
      ) : null}

      <div className="space-y-6">
        {loading ? (
          <div className="bg-card p-8 rounded-lg border border-border">
            <TableRowSkeleton rows={3} />
          </div>
        ) : items.length > 0 ? (
          items.map((v, i) => (
            <FadeIn key={v.id} delay={0.1 * i}>
              <div className="bg-card p-6 md:p-8 rounded-lg flex flex-col md:flex-row items-center justify-between gap-6 shadow-sm border relative overflow-hidden transition-all hover:-translate-y-1 bg-card border-border">
                <div className={`absolute left-0 top-0 bottom-0 w-2 ${v.status === 'paid' ? 'bg-green-500' : 'bg-red-500/80'}`} />
                  
                <div className="flex-1 flex gap-4 w-full">
                  <div className="w-12 h-12 bg-black/5 dark:bg-white/5 rounded-md flex items-center justify-center shrink-0">
                    {v.type?.toLowerCase().includes('traffic') || v.type?.includes('مرور') ? <Car className="w-6 h-6 text-foreground"/> : <FileWarning className="w-6 h-6 text-foreground"/>}
                  </div>
                  <div>
                    <div className="flex items-center gap-2 mb-1">
                      <h3 className="text-xl font-bold text-foreground">{v.reason}</h3>
                      <span className={`text-xs px-2 py-0.5 rounded-md font-bold uppercase tracking-wider ${v.status === 'paid' ? 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400' : 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400'}`}>
                        {v.status}
                      </span>
                    </div>
                    <p className="text-sm font-medium text-muted-foreground mb-1">{v.location || t("palestine_territory")}</p>
                    {v.case_number ? <p className="text-xs font-bold text-foreground">{v.case_number}</p> : null}
                    {v.citation ? <p className="text-xs text-muted-foreground">{t("article_label")}: {v.citation}</p> : null}
                    {v.station ? <p className="text-xs text-muted-foreground">{t("station_label")}: {v.station}</p> : null}
                    <p className="text-xs text-muted-foreground border-l-2 border-primary/30 pl-2 ml-1">{new Date(v.issued_at).toLocaleDateString()}</p>
                  </div>
                </div>

                <div className="flex flex-col items-center gap-2 md:items-end w-full md:w-auto mt-4 md:mt-0 pt-4 md:pt-0 border-t md:border-t-0 border-border">
                  <span className="text-2xl font-bold text-foreground">{v.amount} {t("currency_ils")}</span>
                  {v.status === 'unpaid' ? (
                    <Button 
                      disabled={restricted || paying === v.id}
                      title={restricted ? t("requires_accreditation") : undefined}
                      onClick={() => requireAuth(() => setPendingFine(v))}
                      variant="destructive" 
                      className="w-full rounded-xl px-6 bg-red-600 hover:bg-red-700 text-white shadow-md hover:-translate-y-0.5 transition-applesque cursor-pointer"
                    >
                      {paying === v.id ? t("processing") : t("settle")}
                    </Button>
                  ) : (
                    <div className="flex items-center gap-1.5 text-green-600 font-bold text-sm">
                      <CheckCircle className="w-4 h-4" /> {t("settled")}
                    </div>
                  )}
                </div>
              </div>
            </FadeIn>
          ))
        ) : (
          <div className="py-20 text-center bg-card rounded-lg border border-dashed border-border">
            <CheckCircle className="w-16 h-16 text-primary/10 mx-auto mb-4" />
            <p className="text-xl font-bold text-foreground">{t("clean_record")}</p>
            <p className="text-muted-foreground mt-2">{t("no_violations")}</p>
            {!user ? (
              <Button className="mt-4 rounded-xl font-bold" onClick={() => requireAuth(() => {})}>
                {t("settle")}
              </Button>
            ) : null}
          </div>
        )}
      </div>
    </div>
  );
}
