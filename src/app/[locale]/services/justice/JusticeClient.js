"use client";

import { useState } from "react";
import { useTranslations } from "next-intl";
import { Link } from "@/i18n/routing";
import { FadeIn } from "@/components/animations/FadeIn";
import { OfficialCrest, EagleWatermark } from "@/components/brand/BrandMark";
import { Button } from "@/components/ui/button";
import { issuePowerOfAttorney, requestCriminalClearance } from "@/app/actions";
import { toast } from "sonner";
import { Loader2, Scale, Stamp } from "lucide-react";
import { useAuth } from "@/components/auth/AuthProvider";
import { useAuthModal } from "@/context/AuthModalContext";
import { SovereignConfirmModal } from "@/components/ui/SovereignConfirmModal";

const POA_TYPES = [
  { value: "general", key: "poa_general" },
  { value: "real_estate", key: "poa_real_estate" },
  { value: "legal_litigation", key: "poa_legal" },
  { value: "banking", key: "poa_banking" },
  { value: "vehicle", key: "poa_vehicle" },
];

export function JusticeClient({
  initialPoas = [],
  initialCerts = [],
  gateError = null,
}) {
  const t = useTranslations("Justice");
  const ts = useTranslations("SuperApp");
  const [tab, setTab] = useState("poa");
  const [poas, setPoas] = useState(initialPoas);
  const [certs, setCerts] = useState(initialCerts);
  const [isPoaLoading, setIsPoaLoading] = useState(false);
  const [isClearanceLoading, setIsClearanceLoading] = useState(false);
  const [poaDraft, setPoaDraft] = useState(null);
  const { user, loading: authLoading } = useAuth();
  const { requireAuth } = useAuthModal();
  const confirmT = useTranslations("Confirm");
  const guest = !authLoading && !user;
  const blocked = gateError && !guest && !String(gateError).includes("Not authenticated");

  if (blocked) {
    return (
      <div className="flex flex-col items-center justify-center gap-4 bg-background px-4 py-16">
        <p className="max-w-lg text-center text-base font-semibold text-foreground">
          {String(gateError).includes("اعتماد") ? ts("accreditation_required") : ts("login_required")}
        </p>
        {String(gateError).includes("اعتماد") ? null : (
          <Button asChild className="rounded-full px-6 font-bold">
            <Link href="/auth/login">{ts("login_cta")}</Link>
          </Button>
        )}
      </div>
    );
  }

  const handlePoa = async (e) => {
    e.preventDefault();
    const formData = new FormData(e.currentTarget);
    const draft = Object.fromEntries(formData.entries());
    requireAuth(() => setPoaDraft(draft));
  };

  const issuePoa = async () => {
    if (!poaDraft) return;
    setIsPoaLoading(true);
    const formData = new FormData();
    Object.entries(poaDraft).forEach(([key, value]) => formData.set(key, value));
    const result = await issuePowerOfAttorney(formData);
    if (result.success) {
      toast.success(t("success_poa"));
      setPoas((prev) => [result.poa, ...prev]);
      setPoaDraft(null);
    } else {
      toast.error(result.error || ts("failed"));
    }
    setIsPoaLoading(false);
  };

  const handleClearance = async (e) => {
    e.preventDefault();
    if (!user) {
      requireAuth(() => {});
      return;
    }
    setIsClearanceLoading(true);
    const purpose = new FormData(e.currentTarget).get("purpose");
    const result = await requestCriminalClearance(purpose);
    if (result.success) {
      toast.success(t("success_cert"));
      setCerts((prev) => [result.certificate, ...prev]);
      e.currentTarget.reset();
    } else {
      toast.error(result.error || ts("failed"));
    }
    setIsClearanceLoading(false);
  };

  return (
    <div className="space-y-8">
      <FadeIn>
        <div className="relative overflow-hidden rounded-lg border border-[color:var(--gold)]/40 bg-primary p-8 text-white">
          <EagleWatermark opacity={0.14} />
          <div className="relative z-10 flex items-start gap-4">
            <OfficialCrest size={56} />
            <div>
              <div className="mb-2 inline-flex items-center gap-2 rounded-full border border-[color:var(--gold)]/40 bg-white/10 px-3 py-1 text-xs font-bold">
                <Scale className="h-3.5 w-3.5" />
                <Stamp className="h-3.5 w-3.5 text-[color:var(--gold)]" />
              </div>
              <h1 className="text-3xl font-black tracking-tight sm:text-4xl">{t("title")}</h1>
              <p className="mt-2 max-w-2xl text-white/85">{t("subtitle")}</p>
            </div>
          </div>
        </div>
      </FadeIn>

      <div className="flex gap-2">
        {["poa", "clearance"].map((key) => (
          <button
            key={key}
            type="button"
            onClick={() => setTab(key)}
            className={`rounded-full px-5 py-2.5 text-sm font-bold transition-colors ${
              tab === key
                ? "bg-primary text-primary-foreground"
                : "bg-muted text-foreground hover:bg-muted/80"
            }`}
          >
            {key === "poa" ? t("tab_poa") : t("tab_clearance")}
          </button>
        ))}
      </div>

      {tab === "poa" ? (
        <FadeIn>
          <form
            onSubmit={handlePoa}
            className="bg-card space-y-4 rounded-lg border border-border p-6 sm:p-8"
          >
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <div>
                <label className="mb-1.5 block text-sm font-semibold">{t("agent_id")}</label>
                <input
                  name="agentNationalId"
                  required
                  pattern="\d{9}"
                  maxLength={9}
                  className="w-full rounded-xl border border-input bg-card px-4 py-3 font-mono"
                  dir="ltr"
                />
              </div>
              <div>
                <label className="mb-1.5 block text-sm font-semibold">{t("agent_name")}</label>
                <input
                  name="agentFullName"
                  required
                  className="w-full rounded-xl border border-input bg-card px-4 py-3"
                />
              </div>
              <div>
                <label className="mb-1.5 block text-sm font-semibold">{t("poa_type")}</label>
                <select
                  name="poaType"
                  required
                  className="w-full rounded-xl border border-input bg-popover px-4 py-3"
                >
                  {POA_TYPES.map((p) => (
                    <option key={p.value} value={p.value}>
                      {t(p.key)}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className="mb-1.5 block text-sm font-semibold">{t("expires")}</label>
                <input
                  type="date"
                  name="expiresAt"
                  required
                  className="w-full rounded-xl border border-input bg-card px-4 py-3"
                />
              </div>
              <div className="sm:col-span-2">
                <label className="mb-1.5 block text-sm font-semibold">{t("terms")}</label>
                <textarea
                  name="terms"
                  required
                  rows={4}
                  className="w-full rounded-xl border border-input bg-card px-4 py-3"
                />
              </div>
            </div>
            <Button type="submit" disabled={isPoaLoading} className="h-12 rounded-xl px-8 font-bold">
              {isPoaLoading ? <Loader2 className="h-5 w-5 animate-spin" /> : t("issue_poa")}
            </Button>
          </form>

          <div className="mt-6 space-y-3">
            <h3 className="font-bold text-foreground">{t("your_poas")}</h3>
            {poas.length === 0 ? (
              <p className="text-sm text-muted-foreground">{t("empty_poa")}</p>
            ) : (
              poas.map((p) => (
                <div
                  key={p.id}
                  className="relative overflow-hidden rounded-md border border-[color:var(--gold)]/30 bg-card p-4"
                >
                  <OfficialCrest size={28} className="absolute end-4 top-4 opacity-40" />
                  <p className="font-bold">{p.agent_full_name}</p>
                  <p className="font-mono text-xs text-muted-foreground" dir="ltr">
                    {p.poa_number}
                  </p>
                  <p className="mt-1 text-xs text-muted-foreground">
                    {p.poa_type} · {p.expires_at}
                  </p>
                </div>
              ))
            )}
          </div>
        </FadeIn>
      ) : (
        <FadeIn>
          <form
            onSubmit={handleClearance}
            className="bg-card space-y-4 rounded-lg border border-border p-6 sm:p-8"
          >
            <div>
              <label className="mb-1.5 block text-sm font-semibold">
                {t("clearance_purpose")}
              </label>
              <input
                name="purpose"
                required
                className="w-full rounded-xl border border-input bg-card px-4 py-3"
              />
            </div>
            <Button type="submit" disabled={isClearanceLoading} className="h-12 rounded-xl px-8 font-bold">
              {isClearanceLoading ? (
                <Loader2 className="h-5 w-5 animate-spin" />
              ) : (
                t("request_clearance")
              )}
            </Button>
          </form>

          <div className="mt-6 space-y-3">
            <h3 className="font-bold text-foreground">{t("your_certs")}</h3>
            {certs.length === 0 ? (
              <p className="text-sm text-muted-foreground">{t("empty_certs")}</p>
            ) : (
              certs.map((c) => (
                <div
                  key={c.id}
                  className="relative overflow-hidden rounded-md border border-[color:var(--gold)]/30 bg-card p-4"
                >
                  <OfficialCrest size={28} className="absolute end-4 top-4 opacity-40" />
                  <p className="font-mono text-sm font-bold" dir="ltr">
                    {c.cert_number}
                  </p>
                  <p className="mt-1 text-sm text-muted-foreground">{c.purpose}</p>
                  <p className="mt-1 text-xs text-muted-foreground">{c.status}</p>
                </div>
              ))
            )}
          </div>
        </FadeIn>
      )}
    </div>
  );
}
