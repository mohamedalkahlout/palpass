"use client";

import { useState } from "react";
import { useLocale, useTranslations } from "next-intl";
import { FadeIn } from "@/components/animations/FadeIn";
import { Button } from "@/components/ui/button";
import { contributeToCharity } from "@/app/actions";
import { notifyWalletUpdated } from "@/lib/wallet-events";
import { toast } from "sonner";
import { CheckCircle, Heart, Loader2 } from "lucide-react";
import { Link } from "@/i18n/routing";
import { useAuthModal } from "@/context/AuthModalContext";

const QUICK = [50, 100, 250];

export function CharityClient({ initialCampaigns = [], fetchError = null }) {
  const t = useTranslations("Charity");
  const ts = useTranslations("SuperApp");
  const locale = useLocale();
  const isAr = locale === "ar";
  const [campaigns, setCampaigns] = useState(initialCampaigns);
  const [selectedId, setSelectedId] = useState(initialCampaigns[0]?.id || null);
  const [amount, setAmount] = useState(100);
  const [anonymous, setAnonymous] = useState(false);
  const [loading, setLoading] = useState(false);
  const [receipt, setReceipt] = useState(null);
  const { requireAuth } = useAuthModal();

  const selected = campaigns.find((c) => c.id === selectedId) || campaigns[0];

  const handleDonate = async () => {
    if (!selected?.id || !amount || amount <= 0) return;
    setLoading(true);
    const result = await contributeToCharity(selected.id, amount, anonymous);
    if (result.success) {
      notifyWalletUpdated(result.newBalance);
      toast.success(t("success_title"));
      setReceipt({
        number: result.receiptNumber,
        amount,
        balance: result.newBalance,
      });
      setCampaigns((prev) =>
        prev.map((c) =>
          c.id === selected.id
            ? {
                ...c,
                collected_amount:
                  result.campaignCollected ??
                  Number(c.collected_amount) + Number(amount),
              }
            : c
        )
      );
    } else {
      const err = result.error || t("failed");
      if (String(err).toLowerCase().includes("auth") || String(err).includes("تسجيل")) {
        toast.error(ts("login_required"));
      } else {
        toast.error(err);
      }
    }
    setLoading(false);
  };

  return (
    <div className="overflow-x-clip bg-background py-12 px-4 sm:px-6 lg:px-8">
      <div className="mx-auto max-w-5xl space-y-8">
        <FadeIn className="text-center">
          <div className="mb-4 inline-flex items-center rounded-full border border-red-500/20 bg-red-500/10 px-4 py-1.5 text-sm font-semibold text-red-600 dark:text-red-400">
            <Heart className="me-2 h-4 w-4 animate-pulse" />
            {t("fund")}
          </div>
          <h1 className="text-3xl font-bold tracking-tight text-foreground sm:text-5xl">
            {t("title")}
          </h1>
          <p className="mx-auto mt-3 max-w-2xl text-muted-foreground">{t("subtitle")}</p>
        </FadeIn>

        {fetchError ? (
          <p className="text-center text-muted-foreground">{fetchError}</p>
        ) : null}

        {receipt ? (
          <FadeIn>
            <div className="rounded-lg border border-border bg-card p-10 text-center">
              <CheckCircle className="mx-auto mb-4 h-14 w-14 text-green-600" />
              <h3 className="text-2xl font-bold">{t("success_title")}</h3>
              <p className="mt-2 text-muted-foreground">{t("success_desc")}</p>
              <p className="mt-4 font-mono text-sm font-bold text-primary" dir="ltr">
                {t("receipt")}: {receipt.number}
              </p>
              {receipt.balance != null ? (
                <p className="mt-2 text-sm text-muted-foreground">
                  {t("new_balance")}: {Number(receipt.balance).toFixed(2)}{" "}
                  {ts("currency_ils")}
                </p>
              ) : null}
              <Button
                className="mt-6 rounded-lg"
                variant="outline"
                onClick={() => setReceipt(null)}
              >
                {t("donate_now")}
              </Button>
            </div>
          </FadeIn>
        ) : campaigns.length === 0 ? (
          <div className="rounded-lg border border-border bg-card p-12 text-center text-muted-foreground">
            {t("no_campaigns")}
          </div>
        ) : (
          <div className="grid grid-cols-1 gap-6 lg:grid-cols-5">
            <div className="space-y-4 lg:col-span-3">
              {campaigns.map((c, i) => {
                const pct = Math.min(
                  100,
                  Math.round(
                    (Number(c.collected_amount) / Math.max(1, Number(c.target_amount))) *
                      100
                  )
                );
                const active = selected?.id === c.id;
                return (
                  <FadeIn key={c.id} delay={0.04 * i}>
                    <button
                      type="button"
                      onClick={() => setSelectedId(c.id)}
                      className={`w-full rounded-lg border p-5 text-start transition-all ${
                        active
                          ? "border-primary bg-primary/5 shadow-md"
                          : "border-border bg-card hover:border-primary/40"
                      }`}
                    >
                      <h3 className="text-lg font-bold text-foreground">
                        {isAr ? c.title_ar : c.title_en}
                      </h3>
                      <p className="mt-1 line-clamp-2 text-sm text-muted-foreground">
                        {isAr ? c.description_ar : c.description_en}
                      </p>
                      <div className="mt-4">
                        <div className="mb-1.5 flex justify-between text-xs font-semibold">
                          <span>{t("progress")}</span>
                          <span className="text-primary">{pct}%</span>
                        </div>
                        <div className="h-2.5 w-full overflow-hidden rounded-full bg-muted">
                          <div
                            className="h-full rounded-full bg-primary transition-all"
                            style={{ width: `${pct}%` }}
                          />
                        </div>
                        <p className="mt-2 text-xs text-muted-foreground">
                          {Number(c.collected_amount).toLocaleString()} /{" "}
                          {Number(c.target_amount).toLocaleString()} {ts("currency_ils")}{" "}
                          {t("of_target")}
                        </p>
                      </div>
                    </button>
                  </FadeIn>
                );
              })}
            </div>

            <FadeIn delay={0.1} className="lg:col-span-2">
              <div className="sticky top-24 space-y-5 rounded-lg border border-border bg-card p-6">
                <h3 className="text-xl font-bold">{t("contribute")}</h3>
                <div className="grid grid-cols-3 gap-2">
                  {QUICK.map((amt) => (
                    <button
                      key={amt}
                      type="button"
                      onClick={() => setAmount(amt)}
                      className={`rounded-xl border py-3 text-sm font-bold ${
                        amount === amt
                          ? "border-primary bg-primary text-primary-foreground"
                          : "border-border hover:bg-muted"
                      }`}
                    >
                      {amt} ₪
                    </button>
                  ))}
                </div>
                <div>
                  <label className="mb-1.5 block text-sm font-semibold">
                    {t("amount_label")}
                  </label>
                  <input
                    type="number"
                    min={1}
                    value={amount}
                    onChange={(e) => setAmount(Number(e.target.value))}
                    placeholder={t("custom_amount")}
                    className="w-full rounded-xl border border-input bg-card px-4 py-3"
                  />
                </div>
                <label className="flex items-center gap-2 text-sm font-medium">
                  <input
                    type="checkbox"
                    checked={anonymous}
                    onChange={(e) => setAnonymous(e.target.checked)}
                    className="size-4 rounded border-input"
                  />
                  {t("anonymous")}
                </label>
                <Button
                  onClick={() => requireAuth(handleDonate)}
                  disabled={loading || !selected}
                  className="h-12 w-full rounded-lg font-bold"
                >
                  {loading ? (
                    <Loader2 className="h-5 w-5 animate-spin" />
                  ) : (
                    t("donate_btn")
                  )}
                </Button>
                <p className="text-center text-xs text-muted-foreground">
                  <Link href="/auth/login" className="underline underline-offset-2">
                    {ts("login_cta")}
                  </Link>
                </p>
              </div>
            </FadeIn>
          </div>
        )}
      </div>
    </div>
  );
}
