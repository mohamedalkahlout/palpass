"use client";

import { useMemo, useState } from "react";
import { useLocale, useTranslations } from "next-intl";
import { FadeIn } from "@/components/animations/FadeIn";
import { OfficialCrest } from "@/components/brand/BrandMark";
import { Button } from "@/components/ui/button";
import ProtectedAction from "@/components/auth/ProtectedAction";
import { useAuth } from "@/components/auth/AuthProvider";
import { useAuthModal } from "@/context/AuthModalContext";
import { bookCivicAppointment } from "@/app/actions";
import { toast } from "sonner";
import { DataTable } from "@/components/ui/DataTable";
import { StatusTag } from "@/components/ui/StatusTag";
import { CalendarDays, Loader2 } from "lucide-react";

const MINISTRIES = [
  { code: "transport", key: "ministry_transport", ar: "وزارة النقل والمواصلات", en: "Ministry of Transport" },
  { code: "civil_affairs", key: "ministry_civil", ar: "وزارة الشؤون المدنية", en: "Ministry of Civil Affairs" },
  { code: "health", key: "ministry_health", ar: "وزارة الصحة", en: "Ministry of Health" },
  { code: "justice", key: "ministry_justice", ar: "وزارة العدل", en: "Ministry of Justice" },
];

const BRANCHES = [
  { key: "branch_main", ar: "المقر الرئيسي", en: "Main branch" },
  { key: "branch_ramallah", ar: "فرع رام الله", en: "Ramallah branch" },
  { key: "branch_nablus", ar: "فرع نابلس", en: "Nablus branch" },
];

const SLOTS = ["09:00", "10:00", "11:00", "12:00", "13:00", "14:00", "15:00"];

export function AppointmentsClient({ initialAppointments = [], gateError = null, initialMinistry = "" }) {
  const t = useTranslations("Appointments");
  const ts = useTranslations("SuperApp");
  const guestT = useTranslations("GuestAuth");
  const { user, loading: authLoading } = useAuth();
  const { openAuthModal } = useAuthModal();
  const locale = useLocale();
  const isAr = locale === "ar";
  const [appointments, setAppointments] = useState(initialAppointments);
  const [slot, setSlot] = useState("09:00");
  const [loading, setLoading] = useState(false);
  const accreditationWall = gateError && String(gateError).includes("اعتماد");

  const ministryMap = useMemo(
    () => Object.fromEntries(MINISTRIES.map((m) => [m.code, m])),
    []
  );

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
    const form = e.currentTarget;
    const formData = new FormData(form);
    const code = formData.get("ministryCode");
    const ministry = ministryMap[code] || MINISTRIES[0];
    const branchKey = formData.get("branchKey");
    const branch = BRANCHES.find((b) => b.key === branchKey) || BRANCHES[0];

    formData.set("ministryNameAr", ministry.ar);
    formData.set("ministryNameEn", ministry.en);
    formData.set("serviceNameAr", t("service_generic"));
    formData.set("serviceNameEn", t("service_generic"));
    formData.set("branchLocationAr", branch.ar);
    formData.set("branchLocationEn", branch.en);
    formData.set("timeSlot", slot);

    const result = await bookCivicAppointment(formData);
    if (result.success) {
      toast.success(t("success"));
      setAppointments((prev) => [...prev, result.appointment]);
      form.reset();
    } else {
      toast.error(result.error || ts("failed"));
    }
    setLoading(false);
  };

  return (
    <div className="overflow-x-clip bg-background py-12 px-4 sm:px-6 lg:px-8">
      <div className="mx-auto max-w-5xl space-y-8">
        <FadeIn>
          <div className="flex items-start gap-3">
            <OfficialCrest size={40} />
            <div>
              <h1 className="text-3xl font-black tracking-tight text-foreground sm:text-4xl">
                {t("title")}
              </h1>
              <p className="mt-2 text-muted-foreground">{t("subtitle")}</p>
            </div>
          </div>
        </FadeIn>

        <FadeIn delay={0.05}>
          <form
            onSubmit={handleSubmit}
            className="space-y-5 rounded-lg border border-border bg-card p-6 sm:p-8"
          >
            <h2 className="flex items-center gap-2 text-lg font-bold">
              <CalendarDays className="h-5 w-5 text-primary" />
              {t("book")}
            </h2>

            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <div>
                <label className="mb-1.5 block text-sm font-semibold">{t("ministry")}</label>
                <select
                  name="ministryCode"
                  required
                  defaultValue={initialMinistry || undefined}
                  className="w-full rounded-xl border border-input bg-popover px-4 py-3 text-popover-foreground"
                >
                  {MINISTRIES.map((m) => (
                    <option key={m.code} value={m.code}>
                      {t(m.key)}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className="mb-1.5 block text-sm font-semibold">{t("branch")}</label>
                <select
                  name="branchKey"
                  required
                  className="w-full rounded-xl border border-input bg-popover px-4 py-3 text-popover-foreground"
                >
                  {BRANCHES.map((b) => (
                    <option key={b.key} value={b.key}>
                      {t(b.key)}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className="mb-1.5 block text-sm font-semibold">{t("date")}</label>
                <input
                  type="date"
                  name="appointmentDate"
                  required
                  className="w-full rounded-xl border border-input bg-card px-4 py-3 text-card-foreground"
                />
              </div>
            </div>

            <div>
              <label className="mb-2 block text-sm font-semibold">{t("time_slot")}</label>
              <div className="grid grid-cols-3 gap-2 sm:grid-cols-4 md:grid-cols-7">
                {SLOTS.map((s) => (
                  <button
                    key={s}
                    type="button"
                    onClick={() => setSlot(s)}
                    className={`rounded-xl border px-2 py-2.5 text-sm font-bold transition-colors ${
                      slot === s
                        ? "border-primary bg-primary text-primary-foreground"
                        : "border-border bg-card text-foreground hover:bg-muted"
                    }`}
                  >
                    {s}
                  </button>
                ))}
              </div>
            </div>

            <ProtectedAction className="inline-block">
              <Button type="submit" disabled={loading} className="h-12 rounded-xl px-8 font-bold">
                {loading ? <Loader2 className="h-5 w-5 animate-spin" /> : t("book")}
              </Button>
            </ProtectedAction>
          </form>
        </FadeIn>

        <FadeIn delay={0.1}>
          <div>
            <h2 className="mb-3 text-lg font-bold">{t("your_tickets")}</h2>
            <DataTable
              caption={t("your_tickets")}
              empty={t("empty")}
              columns={[
                { key: "ref", header: t("booking_ref") },
                { key: "ministry", header: t("ministry") },
                { key: "when", header: t("date") },
                { key: "status", header: t("status") },
              ]}
              rows={appointments.map((a) => ({
                id: a.id,
                ref: a.booking_reference,
                ministry: isAr ? a.ministry_name_ar : a.ministry_name_en,
                when: `${a.appointment_date} · ${a.time_slot}`,
                status: <StatusTag status={a.status === "cancelled" ? "rejected" : a.status === "completed" ? "resolved" : "pending"}>{a.status || t("book")}</StatusTag>,
              }))}
            />
          </div>
        </FadeIn>
      </div>
    </div>
  );
}
