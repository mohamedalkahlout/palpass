"use client";

import { useEffect, useState } from "react";
import { useTranslations } from "next-intl";
import { OfficialCrest } from "@/components/brand/BrandMark";
import ProtectedAction from "@/components/auth/ProtectedAction";
import { SovereignConfirmModal } from "@/components/ui/SovereignConfirmModal";
import { requestTaxClearance } from "@/app/actions";
import { toast } from "sonner";

const PURPOSES = ["commercial_bid", "travel", "land_transfer", "general_clearance"];
const EASE = "transition-all duration-[250ms] ease-[cubic-bezier(0.16,1,0.3,1)] motion-reduce:transition-none";

function daysLeft(validUntil, now) {
  const end = new Date(`${validUntil}T00:00:00`);
  return Math.ceil((end.getTime() - now) / 86400000);
}

function dateOnly(value) {
  if (!value) return "—";
  return String(value).slice(0, 10);
}

export function TaxClearanceClient({ certificates = [] }) {
  const t = useTranslations("TaxClearance");
  const [purpose, setPurpose] = useState("general_clearance");
  const [open, setOpen] = useState(false);
  const [sending, setSending] = useState(false);
  const [rows, setRows] = useState(certificates);
  const [now, setNow] = useState(null);
  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect -- one-shot hydration-safe timestamp (by design)
    setNow(Date.now());
  }, []);

  const issue = async () => {
    setSending(true);
    const formData = new FormData();
    formData.set("purpose", purpose);
    const result = await requestTaxClearance(formData);
    setSending(false);
    setOpen(false);
    if (result?.success) {
      toast.success(`${t("issued")} ${result.clearanceCode}`);
      setRows((prev) => [
        {
          id: result.clearanceCode,
          clearance_code: result.clearanceCode,
          purpose,
          income_tax_status: "settled",
          vat_status: "settled",
          property_tax_status: "settled",
          valid_until: new Date(Date.now() + 90 * 86400000).toISOString().slice(0, 10),
          issued_at: new Date().toISOString(),
        },
        ...prev,
      ]);
    } else toast.error(result?.error || t("empty"));
  };

  return (
    <div className="space-y-6">
      {rows.length === 0 ? <p className="rounded-lg border border-white/20 bg-card p-8 text-center">{t("empty")}</p> : rows.map((row) => {
        const left = now ? daysLeft(row.valid_until, now) : null;
        const width = left == null ? 0 : Math.max(0, Math.min(100, (left / 90) * 100));
        return (
          <article key={row.id} className="relative overflow-hidden rounded-lg border-2 border-emerald-900/15 bg-card p-5 dark:border-emerald-500/20 sm:p-7">
            <div className="pointer-events-none absolute -end-6 -top-6 hidden h-36 w-36 rotate-12 items-center justify-center rounded-full border-2 border-dashed border-[#b45309]/70 bg-[#b45309]/5 text-center min-[768px]:flex dark:bg-amber-950/30">
              <span className="max-w-[7.5rem] px-2 text-[10px] font-black leading-tight text-[#b45309]">{t("stamp")}</span>
            </div>
            <p className="mb-4 text-center text-[11px] font-black tracking-wide text-[#b45309] min-[768px]:hidden">{t("stamp")}</p>

            <p className="break-all pe-0 font-mono text-lg font-black text-[#b45309] min-[768px]:pe-28">{row.clearance_code}</p>
            <p className="mt-1 font-bold text-[#064e3b] dark:text-emerald-50">{t(row.purpose)}</p>

            <div className="mt-5 grid grid-cols-1 gap-3 min-[640px]:grid-cols-3">
              {[["income", row.income_tax_status], ["vat", row.vat_status], ["property", row.property_tax_status]].map(([key, status]) => {
                const clear = status === "settled" || status === "exempt";
                return (
                  <div key={key} className="rounded-md border bg-card p-4 border-border">
                    <p className="flex items-center gap-2 text-xs text-foreground dark:text-zinc-400">
                      <span className={`h-2.5 w-2.5 shrink-0 rounded-full ${clear ? "animate-pulse bg-emerald-500 shadow-[0_0_10px_#047857] motion-reduce:animate-none" : "bg-[#b45309]"}`} aria-hidden />
                      {t(key)}
                    </p>
                    <p className="mt-2 text-base font-black text-[#064e3b] dark:text-emerald-50">{t(status)}</p>
                    <p className="mt-1 text-[11px] text-muted-foreground">{clear ? t("clear_beacon") : t("dues_pending")}</p>
                  </div>
                );
              })}
            </div>

            <div className="mt-6">
              <div className="mb-2 flex flex-wrap items-end justify-between gap-2 text-sm">
                <p className="font-semibold text-[#1c1917] dark:text-zinc-100">{t("days_left")}: <span className="font-black tabular-nums text-[#064e3b] dark:text-emerald-200">{left ?? "—"}</span> {t("of_days")}</p>
              </div>
              <div className="h-2.5 overflow-hidden rounded-full bg-[#f5f5f4] dark:bg-zinc-800">
                <div className={`h-full rounded-full bg-primary ${EASE}`} style={{ width: `${width}%` }} />
              </div>
              <div className="mt-3 grid grid-cols-1 gap-2 text-xs text-foreground min-[640px]:grid-cols-2 dark:text-zinc-400">
                <p><span className="block text-muted-foreground">{t("issued_on")}</span><span className="font-bold text-[#1c1917] dark:text-zinc-100">{dateOnly(row.issued_at)}</span></p>
                <p><span className="block text-muted-foreground">{t("valid_until")}</span><span className="font-bold text-[#1c1917] dark:text-zinc-100">{dateOnly(row.valid_until)}</span></p>
              </div>
            </div>
          </article>
        );
      })}

      <label className="block text-sm font-semibold text-[#1c1917] dark:text-zinc-100">
        {t("purpose")}
        <select
          value={purpose}
          onChange={(event) => setPurpose(event.target.value)}
          className={`mt-2 w-full rounded-md border border-emerald-900/15 bg-card px-4 py-3 text-[#1c1917] shadow-sm focus:border-[#047857] focus:outline-none dark:text-zinc-100 ${EASE}`}
        >
          {PURPOSES.map((item) => <option key={item} value={item}>{t(item)}</option>)}
        </select>
      </label>
      <ProtectedAction className="block" onAction={() => setOpen(true)}>
        <button type="button" className={`flex w-full items-center justify-center gap-3 rounded-md border border-emerald-500/30 bg-primary px-8 py-4 font-semibold text-white hover:-translate-y-0.5 motion-reduce:hover:translate-y-0 ${EASE}`}>
          {t("issue")}
        </button>
      </ProtectedAction>
    </div>
  );
}
