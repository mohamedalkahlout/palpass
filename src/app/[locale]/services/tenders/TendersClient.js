"use client";

import { useEffect, useState } from "react";
import { useTranslations } from "next-intl";
import { Loader2 } from "lucide-react";
import { OfficialCrest } from "@/components/brand/BrandMark";
import { TatreezDivider } from "@/components/ui/TatreezDivider";
import { useAccreditationGate } from "@/hooks/useAccreditationGate";
import ProtectedAction from "@/components/auth/ProtectedAction";
import { SovereignConfirmModal } from "@/components/ui/SovereignConfirmModal";
import { purchaseTenderBrochure } from "@/app/actions";
import { notifyWalletUpdated } from "@/lib/wallet-events";
import { toast } from "sonner";

const CATEGORIES = ["all", "works", "supplies", "consulting", "it_systems"];
const EASE = "transition-all duration-[250ms] ease-[cubic-bezier(0.16,1,0.3,1)] motion-reduce:transition-none";

function daysUntil(deadline, now) {
  const end = new Date(deadline).getTime();
  return Math.ceil((end - now) / 86400000);
}

function money(value) {
  return Number(value || 0).toLocaleString("en-GB", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

export function TendersClient({ tenders = [], purchases = [] }) {
  const t = useTranslations("Tenders");
  const gateT = useTranslations("Common");
  const { ready, restricted } = useAccreditationGate();
  const locked = !ready || restricted;
  const [category, setCategory] = useState("all");
  const [owned, setOwned] = useState(() => new Map(purchases.map((row) => [row.tender_id, row])));
  const [selected, setSelected] = useState(null);
  const [sending, setSending] = useState(false);
  const [now, setNow] = useState(null);
  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect -- one-shot hydration-safe timestamp (by design)
    setNow(Date.now());
  }, []);

  const visible = tenders.filter((row) => category === "all" || row.category === category);

  const confirm = async () => {
    if (!selected || sending || locked) return;
    setSending(true);
    const result = await purchaseTenderBrochure(selected.id);
    setSending(false);
    setSelected(null);
    if (result?.success) {
      notifyWalletUpdated(result.newBalance);
      toast.success(`${t("issued")} ${result.purchaseToken}`);
      setOwned((prev) => {
        const next = new Map(prev);
        next.set(selected.id, { tender_id: selected.id, purchase_token: result.purchaseToken, amount_paid: result.amountDeducted });
        return next;
      });
    } else toast.error(result?.error || t("closed"));
  };

  return (
    <div className="space-y-6">
      {ready && restricted ? (
        <p className="rounded-lg border border-[color:var(--warning)]/40 bg-[color:var(--warning)]/10 px-3 py-2 text-sm font-semibold text-foreground">{gateT("civil_accreditation_required")}</p>
      ) : null}
      <div className="flex flex-wrap gap-2">
        {CATEGORIES.map((item) => (
          <button
            key={item}
            type="button"
            onClick={() => setCategory(item)}
            className={`rounded-full px-4 py-2 text-sm font-bold ${category === item ? "bg-[#064e3b] text-white" : "border border-emerald-900/15 bg-white/80 text-[#064e3b] dark:bg-zinc-900/80 dark:text-emerald-50"} ${EASE}`}
          >
            {t(item)}
          </button>
        ))}
      </div>
      {visible.length === 0 ? <p className="rounded-lg bg-white/80 p-8 text-center dark:bg-zinc-900/80">{t("empty")}</p> : (
        <div className="grid grid-cols-1 gap-4 min-[768px]:grid-cols-2">
          {visible.map((row) => {
            const purchase = owned.get(row.id);
            const left = now ? daysUntil(row.submission_deadline, now) : null;
            const open = row.status === "open";
            return (
              <article key={row.id} className="flex min-w-0 flex-col rounded-lg border border-emerald-900/15 bg-card p-5 shadow-sm dark:border-emerald-500/20">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <span className="rounded-full bg-[#064e3b] px-3 py-1 font-mono text-xs font-bold text-[#d97706]">{row.tender_code}</span>
                  <span className="rounded-full border border-[#b45309]/40 px-3 py-1 text-xs font-bold text-[#b45309]">{row.issuing_body}</span>
                </div>
                <h2 className="mt-3 break-words text-lg font-black text-[#1c1917] dark:text-zinc-50">{row.title}</h2>
                <p className="mt-2 text-sm text-foreground dark:text-zinc-400">{t(row.category)}</p>
                <p className="mt-4 text-sm text-muted-foreground">{t("value")}</p>
                <p className="text-2xl font-black tabular-nums text-[#064e3b] dark:text-emerald-100">{money(row.estimated_value)} <span className="text-sm">{t("ils")}</span></p>
                <p className="mt-2 text-sm">{t("price")}: <span className="font-black text-[#b45309]">{money(row.brochure_price)} {t("ils")}</span></p>
                <p className="mt-3 text-xs text-muted-foreground">{t("deadline")}: {String(row.submission_deadline).slice(0, 10)}</p>
                <p className={`mt-1 text-sm font-bold ${left != null && left < 0 ? "text-[#dc2626]" : "text-[#064e3b] dark:text-emerald-200"}`}>
                  {left == null ? "—" : left < 0 ? t("closed_clock") : t("days_left", { days: left })}
                </p>
                <div className="mt-2 h-1.5 overflow-hidden rounded-full bg-[#f5f5f4] dark:bg-zinc-800">
                  <div className={`h-full bg-primary ${EASE}`} style={{ width: left == null ? "0%" : `${Math.max(0, Math.min(100, (left / 90) * 100))}%` }} />
                </div>
                <div className="mt-4">
                  {purchase ? (
                    <p className="break-all rounded-md bg-emerald-800/10 px-3 py-3 text-sm font-bold text-[#064e3b] dark:text-emerald-100">{t("bought")}: {purchase.purchase_token}</p>
                  ) : open ? (
                    <ProtectedAction className="block" onAction={() => { if (!locked && !sending) setSelected(row); }}>
                      <button type="button" disabled={locked || sending} className={`flex w-full items-center justify-center gap-2 rounded-md border border-emerald-500/30 bg-primary px-4 py-3 text-sm font-semibold text-white hover:-translate-y-0.5 disabled:opacity-60 motion-reduce:hover:translate-y-0 ${EASE}`}>
                        {sending && selected?.id === row.id ? <Loader2 className="h-4 w-4 animate-spin motion-reduce:animate-none" /> : null}
                        {t("buy")}
                      </button>
                    </ProtectedAction>
                  ) : (
                    <p className="text-sm font-bold text-muted-foreground">{t("closed")}</p>
                  )}
                </div>
              </article>
            );
          })}
        </div>
      )}
    </div>
  );
}
