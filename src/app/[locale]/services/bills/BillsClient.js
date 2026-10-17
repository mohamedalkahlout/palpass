"use client";

import { useState } from "react";
import { FadeIn } from "@/components/animations/FadeIn";
import { Button } from "@/components/ui/button";
import { CreditCard, CheckCircle, AlertCircle, Zap, Waves, Wifi } from "lucide-react";
import { toast } from "sonner";
import { useTranslations } from "next-intl";
import { payBill } from "@/app/actions";
import { notifyWalletUpdated } from "@/lib/wallet-events";
import { useAuthModal } from "@/context/AuthModalContext";
import { SovereignConfirmModal } from "@/components/ui/SovereignConfirmModal";

const getProviderIcon = (name) => {
  const lower = name?.toLowerCase() || "";
  if (lower.includes("electric") || lower.includes("كهر") || lower.includes("jdeco") || lower.includes("nedco") || lower.includes("gedco") || lower.includes("selco")) return Zap;
  if (lower.includes("water") || lower.includes("ماء") || lower.includes("مياه") || lower.includes("jwu") || lower.includes("cmwu")) return Waves;
  if (lower.includes("internet") || lower.includes("انترنت") || lower.includes("paltel") || lower.includes("اتصالات") || lower.includes("جوال")) return Wifi;
  return CreditCard;
};

export function BillsClient({ initialBills = [], initialWallet = null, accredited = false, guest = false }) {
  const t = useTranslations("Services");
  const confirmT = useTranslations("Confirm");
  const { requireAuth } = useAuthModal();
  const [bills, setBills] = useState(initialBills);
  const [wallet, setWallet] = useState(initialWallet);
  const [paying, setPaying] = useState(null);
  const [pendingBill, setPendingBill] = useState(null);

  const handlePay = async (bill) => {
    if (!accredited || bill.status === "paid") return;
    setPaying(bill.id);

    const result = await payBill(bill.id);
    if (result.error) {
      toast.error(result.error);
    } else {
      setBills((prev) =>
        prev.map((b) => (b.id === bill.id ? { ...b, status: "paid" } : b))
      );
      setWallet((w) => ({ ...w, balance: result.newBalance }));
      notifyWalletUpdated(result.newBalance);
      toast.success(t("paid_success"));
    }
    setPaying(null);
  };

  const unpaidTotal = bills
    .filter((b) => b.status === "unpaid")
    .reduce((sum, b) => sum + b.amount, 0);

  return (
    <div className="space-y-6">
      {!accredited ? (
        <p className="rounded-lg border border-[color:var(--warning)]/40 bg-[color:var(--warning)]/10 px-3 py-2 text-sm font-semibold text-foreground">
          {t("requires_accreditation")}
        </p>
      ) : null}
      <p className="text-xs font-semibold text-muted-foreground">
        {t("rails")}: {t("palpay")} · {t("jawwal_pay")} · {t("iburaq")}
      </p>

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-5">
        <FadeIn delay={0.05} className="sm:col-span-1">
          <div className="flex h-full flex-col justify-between rounded-lg border border-border bg-card p-4">
            <div className="flex justify-between items-start mb-3">
              <div className="p-3 bg-white dark:bg-black/50 rounded-md shadow-sm">
                <CreditCard className="text-primary h-6 w-6" />
              </div>
              <span className="text-xs font-bold px-3 py-1 bg-card text-card-foreground rounded-full border border-border">
                {t("wallet_chip")}
              </span>
            </div>
            <div>
              <p className="text-sm text-muted-foreground font-medium">
                {t("available_balance")}
              </p>
              <p className="text-3xl font-black tracking-tight text-foreground mt-1">
                {wallet?.balance?.toLocaleString("en-US", {
                  minimumFractionDigits: 2,
                })}
                <span className="text-base font-normal text-muted-foreground ml-1">
                  {t("currency_ils")}
                </span>
              </p>
            </div>
          </div>
        </FadeIn>

        <FadeIn delay={0.1} className="sm:col-span-2">
          <div className="grid grid-cols-2 gap-4 h-full">
            <div className="bg-card rounded-lg p-5 flex flex-col gap-2 border border-red-500/10 h-full">
              <AlertCircle className="text-red-500 w-5 h-5" />
              <p className="text-xs text-muted-foreground font-medium mt-1">
                {t("total_due")}
              </p>
              <p className="text-2xl font-black text-foreground">
                {unpaidTotal.toFixed(2)}{" "}
                <span className="text-xs font-normal">{t("currency_ils")}</span>
              </p>
              <p className="text-xs text-muted-foreground">
                {t("unpaid_count", {
                  count: bills.filter((b) => b.status === "unpaid").length,
                })}
              </p>
            </div>
            <div className="bg-card rounded-lg p-5 flex flex-col gap-2 border border-green-500/10 h-full">
              <CheckCircle className="text-green-500 w-5 h-5" />
              <p className="text-xs text-muted-foreground font-medium mt-1">
                {t("total_paid")}
              </p>
              <p className="text-2xl font-black text-foreground">
                {bills
                  .filter((b) => b.status === "paid")
                  .reduce((s, b) => s + b.amount, 0)
                  .toFixed(2)}
                <span className="text-xs font-normal ml-1">{t("currency_ils")}</span>
              </p>
              <p className="text-xs text-muted-foreground">
                {t("paid_count", {
                  count: bills.filter((b) => b.status === "paid").length,
                })}
              </p>
            </div>
          </div>
        </FadeIn>
      </div>

      <FadeIn delay={0.15}>
        <div className="bg-card rounded-lg p-6 shadow-sm border border-border">
          <h2 className="text-lg font-bold text-foreground mb-5">{t("your_bills")}</h2>

          {bills.length === 0 ? (
            <div className="py-20 text-center">
              <CheckCircle className="w-12 h-12 text-primary/20 mx-auto mb-4" />
              <p className="text-muted-foreground font-medium">{t("no_bills")}</p>
              {guest ? (
                <Button className="mt-4 rounded-xl font-bold" onClick={() => requireAuth(() => {})}>
                  {t("pay_now")}
                </Button>
              ) : null}
            </div>
          ) : (
            <div className="space-y-1">
              {bills.map((bill) => {
                const Icon = getProviderIcon(bill.provider);
                const isPaid = bill.status === "paid";
                return (
                  <div
                    key={bill.id}
                    className="flex items-center gap-4 p-4 rounded-md hover:bg-black/[0.02] dark:hover:bg-white/[0.02] transition-colors"
                  >
                    <div
                      className={`w-11 h-11 rounded-md flex items-center justify-center shrink-0 ${
                        isPaid
                          ? "bg-green-100 dark:bg-green-900/30 text-green-600 dark:text-green-400"
                          : "bg-primary/10 text-primary"
                      }`}
                    >
                      <Icon className="w-5 h-5" />
                    </div>

                    <div className="flex-1 min-w-0">
                      <p className="font-semibold text-sm text-foreground truncate">
                        {bill.provider}
                      </p>
                      {bill.payment_code ? (
                        <p className="text-xs text-muted-foreground">
                          {t("payment_code")} {bill.payment_code}
                          {bill.payment_rail ? ` · ${bill.payment_rail}` : ""}
                        </p>
                      ) : null}
                      <div className="flex items-center gap-3 mt-0.5">
                        <p className="text-xs text-muted-foreground">
                          {isPaid ? t("paid") : `${t("due")} `}
                          {new Date(bill.due_date).toLocaleDateString()}
                        </p>
                        <span
                          className={`inline-flex items-center gap-1 text-[10px] font-bold px-2 py-0.5 rounded-full ${
                            isPaid
                              ? "bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-400"
                              : "bg-red-100 dark:bg-red-900/30 text-red-600 dark:text-red-400"
                          }`}
                        >
                          {isPaid ? t("paid") : t("unpaid")}
                        </span>
                      </div>
                    </div>

                    <div className="flex items-center gap-3 shrink-0">
                      <span className="font-black text-foreground text-sm">
                        {bill.amount.toFixed(2)} {t("currency_ils")}
                      </span>
                      {!isPaid && (
                        <Button
                          size="sm"
                          onClick={() => requireAuth(() => setPendingBill(bill))}
                          disabled={!accredited || paying === bill.id}
                          title={!accredited ? t("requires_accreditation") : undefined}
                          className="rounded-xl px-4 text-xs font-bold cursor-pointer hover:-translate-y-0.5 transition-all shadow-sm shadow-primary/20 shrink-0"
                        >
                          {paying === bill.id ? (
                            <span className="flex items-center gap-1.5">
                              <span className="w-3 h-3 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                              ...
                            </span>
                          ) : (
                            t("pay_now")
                          )}
                        </Button>
                      )}
                      {isPaid && <CheckCircle className="w-5 h-5 text-green-500" />}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </FadeIn>
    </div>
  );
}
