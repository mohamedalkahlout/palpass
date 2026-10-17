"use client";

import { useState } from "react";
import { useTranslations } from "next-intl";
import { FadeIn } from "@/components/animations/FadeIn";
import { OfficialCrest } from "@/components/brand/BrandMark";
import { Button } from "@/components/ui/button";
import ProtectedAction from "@/components/auth/ProtectedAction";
import { useAuth } from "@/components/auth/AuthProvider";
import { useAuthModal } from "@/context/AuthModalContext";
import { submitHajjApplication } from "@/app/actions";
import { toast } from "sonner";
import { Loader2, Moon } from "lucide-react";

const HEALTH = [
  { value: "fit", key: "health_fit" },
  { value: "chronic_condition", key: "health_chronic" },
  { value: "needs_companion", key: "health_companion" },
];

const AGENCIES = ["agency_hanif", "agency_huda", "agency_safa", "agency_tabarak", "agency_duyuf"];

const LOTTERY = {
  registered: "registered",
  nominated: "nominated",
  accepted: "accepted",
  deferred: "deferred",
};

export function HajjClient({ initialApplication = null, gateError = null }) {
  const t = useTranslations("Hajj");
  const ts = useTranslations("SuperApp");
  const guestT = useTranslations("GuestAuth");
  const { user, loading: authLoading } = useAuth();
  const { openAuthModal } = useAuthModal();
  const [application, setApplication] = useState(initialApplication);
  const [loading, setLoading] = useState(false);
  const accreditationWall = gateError && String(gateError).includes("اعتماد");

  if (accreditationWall) {
    return (
      <div className="flex flex-col items-center justify-center gap-4 bg-background px-4 py-16">
        <p className="max-w-lg text-center text-base font-semibold text-foreground">
          {ts("accreditation_required")}
        </p>
      </div>
    );
  }

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (authLoading || !user) {
      if (!authLoading) {
        openAuthModal({ title: guestT("gate_title"), description: guestT("gate_description") });
      }
      return;
    }
    setLoading(true);
    const formData = new FormData(e.currentTarget);
    const result = await submitHajjApplication(formData);
    if (result.success) {
      toast.success(t("success"));
      setApplication(result.application);
    } else {
      toast.error(result.error || ts("failed"));
    }
    setLoading(false);
  };

  const points = application?.priority_points ?? 100;
  const pointsPct = Math.min(100, Math.round((points / 200) * 100));

  return (
    <div className="space-y-8">
      <FadeIn className="text-center">
        <div className="mb-4 inline-flex items-center gap-2 rounded-full border border-[color:var(--gold)]/30 bg-card px-4 py-1.5 text-sm font-semibold shadow-sm">
          <OfficialCrest size={20} />
          <Moon className="h-4 w-4 text-[color:var(--gold)]" />
          {t("badge")}
        </div>
        <h1 className="text-3xl font-bold tracking-tight text-foreground sm:text-5xl">
          {t("title")}
        </h1>
        <p className="mx-auto mt-3 max-w-2xl text-muted-foreground">{t("subtitle")}</p>
      </FadeIn>

      <FadeIn delay={0.05}>
        <div className="bg-card rounded-lg border border-border p-6 sm:p-8">
          <div className="mb-2 flex items-center justify-between text-sm font-semibold">
            <span>{t("points")}</span>
            <span className="text-primary">{points}</span>
          </div>
          <div className="h-3 w-full overflow-hidden rounded-full bg-muted">
            <div
              className="h-full rounded-full bg-primary transition-all"
              style={{ width: `${pointsPct}%` }}
            />
          </div>
          {application ? (
            <p className="mt-3 text-sm text-muted-foreground">
              {t("lottery")}:{" "}
              <span className="font-bold text-foreground">
                {t(LOTTERY[application.lottery_status] || "registered")}
              </span>
              {application.mahram_name ? ` · ${application.mahram_name}` : null}
            </p>
          ) : (
            <p className="mt-3 text-sm text-muted-foreground">{t("empty")}</p>
          )}
        </div>
      </FadeIn>

      <FadeIn delay={0.08}>
        <div className="bg-card rounded-lg border border-border p-6 sm:p-8">
          <h2 className="text-lg font-bold text-foreground">{t("agencies_title")}</h2>
          <ul className="mt-4 space-y-2 text-sm font-medium text-foreground">
            {AGENCIES.map((key) => (
              <li key={key}>{t(key)}</li>
            ))}
          </ul>
          <p className="mt-4 text-sm text-muted-foreground">{t("meningitis")}</p>
        </div>
      </FadeIn>

      {!application ? (
        <FadeIn delay={0.1}>
          <form
            onSubmit={handleSubmit}
            className="bg-card space-y-4 rounded-lg border border-border p-6 sm:p-8"
          >
            <div>
              <label className="mb-1.5 block text-sm font-semibold">{t("season_year")}</label>
              <input
                type="number"
                name="seasonYear"
                defaultValue={2026}
                min={2026}
                className="w-full rounded-xl border border-input bg-card px-4 py-3"
              />
            </div>
            <div>
              <label className="mb-1.5 block text-sm font-semibold">{t("mahram")}</label>
              <input
                name="mahramName"
                className="w-full rounded-xl border border-input bg-card px-4 py-3"
              />
            </div>
            <div>
              <label className="mb-1.5 block text-sm font-semibold">{t("health_status")}</label>
              <select
                name="healthStatus"
                defaultValue="fit"
                className="w-full rounded-xl border border-input bg-popover px-4 py-3"
              >
                {HEALTH.map((h) => (
                  <option key={h.value} value={h.value}>
                    {t(h.key)}
                  </option>
                ))}
              </select>
            </div>
            <ProtectedAction className="block w-full">
              <Button type="submit" disabled={loading} className="h-12 w-full rounded-md font-bold">
                {loading ? <Loader2 className="h-5 w-5 animate-spin" /> : t("submit")}
              </Button>
            </ProtectedAction>
          </form>
        </FadeIn>
      ) : null}
    </div>
  );
}
