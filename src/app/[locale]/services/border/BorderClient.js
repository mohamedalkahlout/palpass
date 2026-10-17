"use client";

import { useMemo, useState } from "react";
import { useLocale, useTranslations } from "next-intl";
import Image from "next/image";
import { Link } from "@/i18n/routing";
import { FadeIn } from "@/components/animations/FadeIn";
import { OfficialCrest } from "@/components/brand/BrandMark";
import { Button } from "@/components/ui/button";
import { submitBorderClearanceRequest } from "@/app/actions";
import { notifyWalletUpdated } from "@/lib/wallet-events";
import { toast } from "sonner";
import { QRCodeSVG } from "qrcode.react";
import { Globe, Loader2 } from "lucide-react";
import { useAuth } from "@/components/auth/AuthProvider";
import { useAuthModal } from "@/context/AuthModalContext";
import { SovereignConfirmModal } from "@/components/ui/SovereignConfirmModal";
import { ModernTatreezAccent } from "@/components/ui/ModernTatreezAccent";

const CROSSINGS = ["karameh_bridge", "rafah_crossing"];
const CATEGORIES = ["medical", "education", "business", "humanitarian", "tourism_family", "delegation"];
const RELATIONS = ["spouse", "child", "parent", "sibling", "other"];
const BULLETIN = [
  { id: "karameh_bridge", status: "status_open" },
  { id: "rafah_crossing", status: "status_limited" },
  { id: "erez_crossing", status: "status_medical" },
];

const emptyCompanion = () => ({ name: "", document: "", relation: "child" });

export function BorderClient({ initialPermits = [], gateError = null, walletBalance = null, accredited = true }) {
  const t = useTranslations("Border");
  const servicesT = useTranslations("Services");
  const ts = useTranslations("SuperApp");
  const locale = useLocale();
  const dir = locale === "ar" ? "rtl" : "ltr";
  const [permits, setPermits] = useState(initialPermits);
  const [loading, setLoading] = useState(false);
  const [tab, setTab] = useState("apply");
  const [step, setStep] = useState(1);
  const [balance, setBalance] = useState(walletBalance);
  const [companions, setCompanions] = useState([]);
  const [logistics, setLogistics] = useState({
    wheelchair: false,
    ambulance: false,
    vipHall: false,
  });
  const [fieldErrors, setFieldErrors] = useState({});
  const [confirmOpen, setConfirmOpen] = useState(false);
  const { user, loading: authLoading } = useAuth();
  const { requireAuth } = useAuthModal();
  const confirmT = useTranslations("Confirm");
  const [draft, setDraft] = useState({
    crossingName: "karameh_bridge",
    travelDate: "",
    travelPurpose: "",
    nameAr: "",
    nameEn: "",
    passportNumber: "",
    passportExpiry: "",
    category: "medical",
    destination: "",
  });

  const setField = (key) => (event) => {
    setDraft((current) => ({ ...current, [key]: event.target.value }));
  };

  const money = useMemo(
    () =>
      new Intl.NumberFormat(locale === "ar" ? "ar-PS" : "en-GB", {
        minimumFractionDigits: 2,
        maximumFractionDigits: 2,
      }),
    [locale]
  );

  const accreditationBlocked = String(gateError || "").includes("اعتماد");

  if (accreditationBlocked) {
    return (
      <div className="flex flex-col items-center justify-center gap-4 bg-background px-4 py-16">
        <p className="max-w-lg text-center text-base font-semibold text-foreground">
          {accreditationBlocked ? ts("accreditation_required") : ts("login_required")}
        </p>
        {accreditationBlocked ? null : (
          <Button asChild className="rounded-full px-6 font-bold">
            <Link href="/auth/login">{ts("login_cta")}</Link>
          </Button>
        )}
      </div>
    );
  }

  const executeSubmit = async () => {
    if (!accredited && step >= 5) {
      toast.error(servicesT("requires_accreditation"));
      return;
    }
    if (step < 5) {
      if (step === 2) {
        const nextErrors = {};
        const passport = String(draft.passportNumber || "").trim().toUpperCase();
        if (!/^[A-Z0-9]{5,12}$/.test(passport)) {
          nextErrors.passportNumber = t("passport_invalid");
        }
        if (!draft.passportExpiry || !draft.travelDate || draft.passportExpiry <= draft.travelDate) {
          nextErrors.passportExpiry = t("passport_expiry_invalid");
        }
        if (Object.keys(nextErrors).length > 0) {
          setFieldErrors(nextErrors);
          return;
        }
        setDraft((current) => ({ ...current, passportNumber: passport }));
      }
      setFieldErrors({});
      setStep((current) => current + 1);
      return;
    }
    setLoading(true);
    const formData = new FormData();
    Object.entries(draft).forEach(([key, value]) => formData.set(key, value));
    formData.set("companions", JSON.stringify(companions));
    formData.set("wheelchair", String(logistics.wheelchair));
    formData.set("ambulance", String(logistics.ambulance));
    formData.set("vipHall", String(logistics.vipHall));
    const result = await submitBorderClearanceRequest(formData);
    if (result.success) {
      toast.success(result.message || t("success"));
      if (result.newBalance != null) {
        setBalance(result.newBalance);
        notifyWalletUpdated(result.newBalance);
      }
      setPermits((prev) => [result.permit, ...prev]);
      setStep(1);
      setCompanions([]);
      setDraft({
        crossingName: "karameh_bridge",
        travelDate: "",
        travelPurpose: "",
        nameAr: "",
        nameEn: "",
        passportNumber: "",
        passportExpiry: "",
        category: "medical",
        destination: "",
      });
      setTab("passes");
    } else {
      toast.error(result.error || ts("failed"));
    }
    setLoading(false);
    setConfirmOpen(false);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!authLoading && !user) {
      requireAuth(() => {});
      return;
    }
    if (step >= 5) {
      setConfirmOpen(true);
      return;
    }
    await executeSubmit();
  };

  return (
    <div className="space-y-6">
      {/* Sovereign Terminal Showcase Banner */}
      <div className="relative h-44 sm:h-52 w-full rounded-2xl overflow-hidden border border-emerald-950/10 dark:border-white/10 shadow-sm">
        <Image
          src="/images/civic/crossing-terminal.webp"
          alt="Crossing Terminal Coordination"
          fill
          priority
          sizes="(max-width: 1024px) 100vw, 800px"
          className="object-cover"
        />
        <div className="absolute inset-0 bg-gradient-to-t from-background/90 via-background/30 to-transparent" />
        <div className="absolute bottom-4 start-5 end-5 flex items-center justify-between">
          <div>
            <span className="text-xs font-bold text-primary block">الإدارة العامة للمعابر والحدود</span>
            <h2 className="text-base sm:text-lg font-bold text-foreground">منظومة تنسيق وتصاريح السفر الرسمية</h2>
          </div>
          <OfficialCrest size={32} className="opacity-90 hidden sm:block" />
        </div>
      </div>

      <ModernTatreezAccent variant="ribbon" className="opacity-15 dark:opacity-5" />

      {gateError ? (
        <div role="alert" className="rounded-md border border-amber-500/40 bg-amber-500/10 px-4 py-3 text-sm font-semibold text-foreground">
          {gateError}
        </div>
      ) : null}
      <div className="grid grid-cols-1 gap-2 rounded-md border border-border bg-card p-2 sm:grid-cols-3">
        {[
          ["apply", "tab_apply"],
          ["passes", "tab_passes"],
          ["status", "tab_status"],
        ].map(([id, key]) => (
          <button
            key={id}
            type="button"
            onClick={() => setTab(id)}
            className={`rounded-xl px-3 py-3 text-sm font-bold ${
              tab === id ? "bg-[#064e3b] text-white" : "text-foreground hover:bg-muted"
            }`}
          >
            {t(key)}
          </button>
        ))}
      </div>

      {tab === "apply" ? (
        <FadeIn>
          <form onSubmit={handleSubmit} className="bg-card space-y-5 rounded-lg border border-border p-6 sm:p-8">
            <div className="flex items-center justify-between gap-3">
              <h2 className="flex items-center gap-2 text-xl font-bold text-foreground">
                <Globe className="h-5 w-5 text-[#064e3b]" />
                {step === 1
                  ? t("step_crossing")
                  : step === 2
                    ? t("step_passport")
                    : step === 3
                      ? t("step_category")
                      : step === 4
                        ? t("step_logistics")
                        : t("step_payment")}
              </h2>
              <span className="text-xs font-bold text-[#C5A059]">{t("step_of", { step })}</span>
            </div>

            {step === 1 ? (
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                <div>
                  <label className="mb-1.5 block text-sm font-semibold">{t("crossing")}</label>
                  <select name="crossingName" required value={draft.crossingName} onChange={setField("crossingName")} className="w-full rounded-xl border border-input bg-popover px-4 py-3 text-popover-foreground">
                    {CROSSINGS.map((c) => (
                      <option key={c} value={c}>{t(c)}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="mb-1.5 block text-sm font-semibold">{t("travel_date")}</label>
                  <input type="date" name="travelDate" required value={draft.travelDate} onChange={setField("travelDate")} className="w-full rounded-xl border border-input bg-card px-4 py-3" />
                </div>
                <div className="sm:col-span-2">
                  <label className="mb-1.5 block text-sm font-semibold">{t("purpose")}</label>
                  <input type="text" name="travelPurpose" required minLength={3} value={draft.travelPurpose} onChange={setField("travelPurpose")} placeholder={t("purpose_ph")} className="w-full rounded-xl border border-input bg-card px-4 py-3" />
                </div>
              </div>
            ) : null}

            {step === 2 ? (
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                <div>
                  <label className="mb-1.5 block text-sm font-semibold">{t("name_ar")}</label>
                  <input type="text" name="nameAr" required minLength={3} value={draft.nameAr} onChange={setField("nameAr")} className="w-full rounded-xl border border-input bg-card px-4 py-3" />
                </div>
                <div>
                  <label className="mb-1.5 block text-sm font-semibold">{t("name_en")}</label>
                  <input type="text" name="nameEn" required dir="ltr" value={draft.nameEn} onChange={setField("nameEn")} className="w-full rounded-xl border border-input bg-card px-4 py-3" />
                </div>
                <div>
                  <label className="mb-1.5 block text-sm font-semibold">{t("passport_number")}</label>
                  <input type="text" name="passportNumber" required dir="ltr" value={draft.passportNumber} onChange={setField("passportNumber")} className="w-full rounded-xl border border-input bg-card px-4 py-3 uppercase" aria-invalid={Boolean(fieldErrors.passportNumber)} />
                  {fieldErrors.passportNumber ? (
                    <p className="mt-1 text-xs font-semibold text-destructive">{fieldErrors.passportNumber}</p>
                  ) : null}
                </div>
                <div>
                  <label className="mb-1.5 block text-sm font-semibold">{t("passport_expiry")}</label>
                  <input type="date" name="passportExpiry" required value={draft.passportExpiry} onChange={setField("passportExpiry")} className="w-full rounded-xl border border-input bg-card px-4 py-3" aria-invalid={Boolean(fieldErrors.passportExpiry)} />
                  {fieldErrors.passportExpiry ? (
                    <p className="mt-1 text-xs font-semibold text-destructive">{fieldErrors.passportExpiry}</p>
                  ) : null}
                </div>
              </div>
            ) : null}

            {step === 3 ? (
              <div className="space-y-4">
                <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                  <div>
                    <label className="mb-1.5 block text-sm font-semibold">{t("category")}</label>
                    <select name="category" required value={draft.category} onChange={setField("category")} className="w-full rounded-xl border border-input bg-card px-4 py-3">
                      {CATEGORIES.map((item) => (
                        <option key={item} value={item}>{t(item)}</option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label className="mb-1.5 block text-sm font-semibold">{t("destination")}</label>
                    <input type="text" name="destination" required minLength={2} value={draft.destination} onChange={setField("destination")} className="w-full rounded-xl border border-input bg-card px-4 py-3" />
                  </div>
                </div>
                <div className="flex items-center justify-between">
                  <h3 className="font-bold">{t("companions")}</h3>
                  <Button type="button" variant="outline" className="rounded-full" onClick={() => setCompanions((rows) => [...rows, emptyCompanion()])}>
                    {t("add_companion")}
                  </Button>
                </div>
                {companions.length === 0 ? (
                  <p className="text-sm text-muted-foreground">{t("no_companions")}</p>
                ) : (
                  companions.map((row, index) => (
                    <div key={index} className="grid grid-cols-1 gap-3 rounded-md border border-border p-3 sm:grid-cols-4">
                      <input
                        required
                        value={row.name}
                        placeholder={t("companion_name")}
                        onChange={(e) => setCompanions((rows) => rows.map((item, i) => i === index ? { ...item, name: e.target.value } : item))}
                        className="rounded-xl border border-input bg-card px-3 py-2 sm:col-span-1"
                      />
                      <input
                        required
                        dir="ltr"
                        value={row.document}
                        placeholder={t("companion_doc")}
                        onChange={(e) => setCompanions((rows) => rows.map((item, i) => i === index ? { ...item, document: e.target.value } : item))}
                        className="rounded-xl border border-input bg-card px-3 py-2"
                      />
                      <select
                        value={row.relation}
                        onChange={(e) => setCompanions((rows) => rows.map((item, i) => i === index ? { ...item, relation: e.target.value } : item))}
                        className="rounded-xl border border-input bg-card px-3 py-2"
                      >
                        {RELATIONS.map((relation) => (
                          <option key={relation} value={relation}>{t(`relation_${relation}`)}</option>
                        ))}
                      </select>
                      <Button type="button" variant="ghost" onClick={() => setCompanions((rows) => rows.filter((_, i) => i !== index))}>
                        {t("remove_companion")}
                      </Button>
                    </div>
                  ))
                )}
              </div>
            ) : null}

            {step === 4 ? (
              <div className="grid grid-cols-1 gap-3">
                {[
                  ["wheelchair", "wheelchair"],
                  ["ambulance", "ambulance"],
                  ["vipHall", "vip_hall"],
                ].map(([key, label]) => (
                  <label key={key} className="flex items-center gap-3 rounded-md border border-border px-4 py-3">
                    <input
                      type="checkbox"
                      checked={logistics[key]}
                      onChange={(e) => setLogistics((current) => ({ ...current, [key]: e.target.checked }))}
                    />
                    <span className="font-semibold">{t(label)}</span>
                  </label>
                ))}
              </div>
            ) : null}

            {step === 5 ? (
              <div className="rounded-md border border-[#C5A059]/50 bg-[#064e3b]/5 p-5">
                {!accredited ? (
                  <p className="mb-3 inline-flex rounded-full border border-amber-500/40 bg-amber-500/10 px-3 py-1 text-xs font-bold text-amber-800 dark:text-amber-200">
                    {servicesT("requires_accreditation")}
                  </p>
                ) : null}
                <p className="text-sm text-muted-foreground">{t("fee_label")}</p>
                <p className="mt-1 text-3xl font-bold text-[#064e3b] dark:text-[#C5A059]" dir="ltr">{t("fee_amount")}</p>
                <p className="mt-3 text-sm">
                  {t("wallet_balance")}:{" "}
                  <span className="font-bold" dir="ltr">
                    {balance == null ? "—" : `${money.format(Number(balance))} ILS`}
                  </span>
                </p>
              </div>
            ) : null}

            <div className="flex flex-wrap gap-3">
              {step > 1 ? (
                <Button type="button" variant="outline" className="rounded-xl" onClick={() => setStep((current) => current - 1)}>
                  {t("prev_step")}
                </Button>
              ) : null}
              <Button type="submit" disabled={loading || (!accredited && step === 5)} title={!accredited ? servicesT("requires_accreditation") : undefined} className="h-12 rounded-xl bg-[#064e3b] px-8 font-bold text-white hover:bg-[#064e3b]/90">
                {loading ? <Loader2 className="h-5 w-5 animate-spin" /> : step < 5 ? t("next_step") : t("pay_and_submit")}
              </Button>
            </div>
          </form>
        </FadeIn>
      ) : null}

      {tab === "passes" ? (
        <FadeIn>
          <div className="bg-card rounded-lg border border-border p-6 sm:p-8">
            <h2 className="mb-5 text-lg font-bold text-foreground">{t("your_permits")}</h2>
            {permits.length === 0 ? (
              <p className="py-10 text-center text-muted-foreground">{t("empty")}</p>
            ) : (
              <ul className="space-y-4">
                {permits.map((p) => (
                  <li key={p.id || p.permit_number} className="grid gap-4 rounded-md border border-[#064e3b]/20 bg-card p-4 sm:grid-cols-[1fr_auto]">
                    <div className="space-y-1 text-start">
                      <p className="text-xs font-bold text-[#C5A059]">{t("pass_title")}</p>
                      <p className="font-bold text-foreground">
                        {["karameh_bridge", "rafah_crossing", "erez_crossing"].includes(p.crossing_name) ? t(p.crossing_name) : p.crossing_name}
                      </p>
                      <p className="font-mono text-xs text-muted-foreground" dir="ltr">
                        {t("tracking")}: {p.clearance_tracking_code || p.permit_number}
                      </p>
                      <p className="text-xs text-muted-foreground">
                        {p.travel_date} · {["under_review", "approved", "rejected"].includes(p.status) ? t(p.status) : p.status}
                        {p.payment_status ? ` · ${["paid", "unpaid", "exempt"].includes(p.payment_status) ? t(p.payment_status) : p.payment_status}` : ""}
                      </p>
                      <p className="text-[11px] font-semibold text-[#064e3b] dark:text-[#C5A059]">{t("seal")}</p>
                    </div>
                    <div className="flex shrink-0 flex-col items-center gap-2 rounded-md bg-white p-3">
                      {p.qr_token ? <QRCodeSVG value={p.qr_token} size={96} level="M" /> : <OfficialCrest size={72} />}
                      <span className="text-[10px] font-bold text-zinc-600">{t("qr")}</span>
                    </div>
                  </li>
                ))}
              </ul>
            )}
          </div>
        </FadeIn>
      ) : null}

      {tab === "status" ? (
        <FadeIn>
          <div className="bg-card space-y-4 rounded-lg border border-border p-6 sm:p-8">
            <p className="text-sm text-muted-foreground">{t("bulletin_note")}</p>
            {BULLETIN.map((row) => (
              <div key={row.id} className="flex items-center justify-between gap-4 rounded-md border border-border px-4 py-4">
                <p className="font-bold">{t(row.id)}</p>
                <p className="text-sm font-semibold text-[#064e3b] dark:text-[#C5A059]">{t(row.status)}</p>
              </div>
            ))}
          </div>
        </FadeIn>
      ) : null}
    </div>
  );
}
