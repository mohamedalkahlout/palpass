"use client";

import { useState } from "react";
import { useTranslations } from "next-intl";
import { FadeIn } from "@/components/animations/FadeIn";
import { Button } from "@/components/ui/button";
import ProtectedAction from "@/components/auth/ProtectedAction";
import { useAuth } from "@/components/auth/AuthProvider";
import { useAuthModal } from "@/context/AuthModalContext";
import { submitCivicReport } from "@/app/actions";
import { toast } from "sonner";
import {
  Droplets,
  Zap,
  Construction,
  BadgeDollarSign,
  Trash2,
  Loader2,
} from "lucide-react";

const CATEGORIES = [
  { value: "water_network", key: "cat_water", Icon: Droplets },
  { value: "electricity", key: "cat_electricity", Icon: Zap },
  { value: "roads_potholes", key: "cat_roads", Icon: Construction },
  { value: "price_gouging", key: "cat_prices", Icon: BadgeDollarSign },
  { value: "sanitation", key: "cat_sanitation", Icon: Trash2 },
];

const STATUS_KEYS = {
  submitted: "status_submitted",
  under_investigation: "status_under_investigation",
  assigned: "status_assigned",
  resolved: "status_resolved",
};

export function ReportsClient({ initialReports = [], gateError = null }) {
  const t = useTranslations("CivicReports");
  const ts = useTranslations("SuperApp");
  const guestT = useTranslations("GuestAuth");
  const { user, loading: authLoading } = useAuth();
  const { openAuthModal } = useAuthModal();
  const [reports, setReports] = useState(initialReports);
  const [category, setCategory] = useState("water_network");
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
    formData.set("category", category);
    const result = await submitCivicReport(formData);
    if (result.success) {
      toast.success(t("success"));
      setReports((prev) => [result.report, ...prev]);
      e.currentTarget.reset();
    } else {
      toast.error(result.error || ts("failed"));
    }
    setLoading(false);
  };

  return (
    <div className="space-y-8">
      <FadeIn>
        <h1 className="text-3xl font-black tracking-tight text-foreground sm:text-4xl">
          {t("title")}
        </h1>
        <p className="mt-2 text-muted-foreground">{t("subtitle")}</p>
      </FadeIn>

      <FadeIn delay={0.05}>
        <form
          onSubmit={handleSubmit}
          className="bg-card space-y-5 rounded-lg border border-border p-6 sm:p-8"
        >
          <div>
            <label className="mb-2 block text-sm font-semibold">{t("category")}</label>
            <div className="grid grid-cols-2 gap-2 sm:grid-cols-5">
              {CATEGORIES.map(({ value, key, Icon }) => (
                <button
                  key={value}
                  type="button"
                  onClick={() => setCategory(value)}
                  className={`flex flex-col items-center gap-2 rounded-md border px-3 py-4 text-center text-xs font-bold transition-colors ${
                    category === value
                      ? "border-primary bg-primary/10 text-primary"
                      : "border-border bg-card text-foreground hover:bg-muted"
                  }`}
                >
                  <Icon className="h-5 w-5" />
                  {t(key)}
                </button>
              ))}
            </div>
          </div>

          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <div>
              <label className="mb-1.5 block text-sm font-semibold">{t("governorate")}</label>
              <input
                name="governorate"
                required
                className="w-full rounded-xl border border-input bg-card px-4 py-3"
              />
            </div>
            <div>
              <label className="mb-1.5 block text-sm font-semibold">{t("city")}</label>
              <input
                name="city"
                required
                className="w-full rounded-xl border border-input bg-card px-4 py-3"
              />
            </div>
            <div className="sm:col-span-2">
              <label className="mb-1.5 block text-sm font-semibold">{t("location")}</label>
              <input
                name="locationDescription"
                required
                className="w-full rounded-xl border border-input bg-card px-4 py-3"
              />
            </div>
            <div className="sm:col-span-2">
              <label className="mb-1.5 block text-sm font-semibold">{t("details")}</label>
              <textarea
                name="details"
                required
                rows={4}
                className="w-full rounded-xl border border-input bg-card px-4 py-3"
              />
            </div>
            <div className="sm:col-span-2">
              <label className="mb-1.5 block text-sm font-semibold">{t("photo_url")}</label>
              <input
                name="photoUrl"
                type="url"
                placeholder="https://"
                className="w-full rounded-xl border border-input bg-card px-4 py-3"
                dir="ltr"
              />
            </div>
          </div>

          <ProtectedAction className="inline-block">
            <Button type="submit" disabled={loading} className="h-12 rounded-xl px-8 font-bold">
              {loading ? <Loader2 className="h-5 w-5 animate-spin" /> : t("submit")}
            </Button>
          </ProtectedAction>
        </form>
      </FadeIn>

      <FadeIn delay={0.1}>
        <div className="bg-card rounded-lg border border-border p-6 sm:p-8">
          <h2 className="mb-5 text-lg font-bold">{t("timeline")}</h2>
          {reports.length === 0 ? (
            <p className="py-8 text-center text-muted-foreground">{t("empty")}</p>
          ) : (
            <ol className="relative space-y-4 border-s border-border ps-6">
              {reports.map((r) => (
                <li key={r.id} className="relative">
                  <span className="absolute -start-[1.65rem] mt-1.5 size-3 rounded-full bg-primary ring-4 ring-background" />
                  <p className="font-bold text-foreground">
                    {CATEGORIES.find((c) => c.value === r.category)
                      ? t(CATEGORIES.find((c) => c.value === r.category).key)
                      : r.category}
                  </p>
                  <p className="font-mono text-xs text-muted-foreground" dir="ltr">
                    {t("tracking_id")}: {r.report_tracking_id}
                  </p>
                  <p className="mt-1 text-sm text-muted-foreground">
                    {r.city}, {r.governorate}
                  </p>
                  <span className="mt-2 inline-flex rounded-full bg-primary/10 px-2.5 py-1 text-[10px] font-bold text-primary">
                    {t(STATUS_KEYS[r.status] || "status_submitted")}
                  </span>
                </li>
              ))}
            </ol>
          )}
        </div>
      </FadeIn>
    </div>
  );
}
