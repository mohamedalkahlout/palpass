"use client";

import { useState } from "react";
import { useTranslations } from "next-intl";
import { QRCodeSVG } from "qrcode.react";
import { BadgeCheck, GraduationCap, Printer } from "lucide-react";
import { EagleWatermark, OfficialCrest } from "@/components/brand/BrandMark";
import ProtectedAction from "@/components/auth/ProtectedAction";
import { SovereignConfirmModal } from "@/components/ui/SovereignConfirmModal";
import { submitServiceRequest } from "@/app/actions";
import { toast } from "sonner";

import Image from "next/image";
import { ModernTatreezAccent } from "@/components/ui/ModernTatreezAccent";

const EASE = "transition-all duration-[250ms] ease-[cubic-bezier(0.16,1,0.3,1)] motion-reduce:transition-none";

export function EducationClient({ records = [] }) {
  const t = useTranslations("Education");
  const [tab, setTab] = useState("tawjihi");
  const [open, setOpen] = useState(false);
  const [sending, setSending] = useState(false);
  const tawjihi = records.find((row) => row.record_type === "tawjihi");
  const degrees = records.filter((row) => row.record_type === "university_degree");

  const confirmEquivalency = async () => {
    setSending(true);
    const result = await submitServiceRequest("degree_equivalency", t("equivalency"));
    setSending(false);
    setOpen(false);
    if (result?.success) toast.success(t("equivalency_sent"));
    else toast.error(result?.error || t("equivalency"));
  };

  return (
    <div className="space-y-6">
      {/* Education Civic Imagery Showcase */}
      <div className="relative h-44 sm:h-56 w-full rounded-2xl overflow-hidden border border-emerald-950/10 dark:border-white/10 shadow-sm">
        <Image
          src="/images/civic/education-future.webp"
          alt="Palestine Academic & Technological Excellence"
          fill
          priority
          sizes="(max-width: 1024px) 100vw, 800px"
          className="object-cover"
        />
        <div className="absolute inset-0 bg-gradient-to-t from-background/90 via-background/25 to-transparent" />
        <div className="absolute bottom-4 start-5 end-5">
          <span className="text-xs font-bold text-primary block">وزارة التربية والتعليم العالي والبحث العلمي</span>
          <p className="text-sm font-semibold text-foreground mt-0.5">
            المنظومة الوطنية الموحدة لكشوف التوجيهي وتصديق المؤهلات الأكاديمية
          </p>
        </div>
      </div>

      <ModernTatreezAccent variant="ribbon" className="opacity-15 dark:opacity-5" />

      <div className="flex flex-col gap-2 rounded-lg border border-border bg-card p-1 min-[640px]:flex-row">
        {[
          ["tawjihi", t("tab_tawjihi")],
          ["university", t("tab_university")],
        ].map(([id, label]) => (
          <button
            key={id}
            type="button"
            onClick={() => setTab(id)}
            className={`min-w-0 flex-1 rounded-xl px-3 py-2.5 text-sm font-bold ${EASE} ${tab === id ? "bg-[#064e3b] text-white shadow-md" : "text-[#064e3b] hover:bg-[#064e3b]/5 dark:text-emerald-100"}`}
          >
            {label}
          </button>
        ))}
      </div>

      {tab === "tawjihi" ? (
        <article className="relative overflow-hidden rounded-lg border-2 border-emerald-900/20 bg-card p-5 dark:border-emerald-500/20 sm:p-8 md:p-12">
          <EagleWatermark className="opacity-5 dark:opacity-10" opacity={1} />
          <div className="relative rounded-md border border-amber-600/30 p-4 sm:p-6">
            <div className="text-center">
              <OfficialCrest size={64} />
              <p className="mt-3 text-base font-black text-[#064e3b] dark:text-emerald-50 sm:text-lg">{t("doc_ar")}</p>
              <p className="mt-1 text-xs tracking-wide text-[#b45309]">{t("doc_en")}</p>
            </div>

            {tawjihi ? (
              <div className="mt-6 space-y-6">
                <div className="mx-auto max-w-xs rounded-md border border-emerald-600/40 bg-primary p-5 text-center text-white">
                  <p className="text-xs font-semibold tracking-wide text-emerald-100/80">{t("gpa")}</p>
                  <p className="mt-1 text-4xl font-black tabular-nums">{Number(tawjihi.gpa_or_grade).toFixed(2)}%</p>
                  <p className="mt-1 text-sm text-emerald-100">{tawjihi.degree_or_stream}</p>
                </div>

                <dl className="grid grid-cols-1 gap-0 min-[640px]:grid-cols-2">
                  {[
                    [t("seat"), tawjihi.seat_or_student_number],
                    [t("year"), tawjihi.completion_year],
                    [t("stream"), tawjihi.degree_or_stream],
                    [t("school"), tawjihi.institution_name],
                  ].map(([label, value]) => (
                    <div key={label} className="border-b border-amber-600/25 px-1 py-3">
                      <dt className="text-xs text-muted-foreground">{label}</dt>
                      <dd className="mt-0.5 break-words font-bold text-[#1c1917] dark:text-zinc-100">{value}</dd>
                    </div>
                  ))}
                </dl>

                <footer className="flex flex-col items-stretch gap-4 border-t border-amber-600/25 pt-5 min-[768px]:flex-row min-[768px]:items-end min-[768px]:justify-between">
                  <div className="min-w-0 space-y-2">
                    <p className="inline-flex max-w-full items-center gap-2 rounded-full border border-emerald-700/30 bg-emerald-800/10 px-3 py-1.5 text-xs font-bold text-[#064e3b] dark:text-emerald-100">
                      <BadgeCheck className="h-4 w-4 shrink-0 text-[#047857]" aria-hidden />
                      <span className="truncate">{t("seal_ok")}</span>
                    </p>
                    <p className="break-all font-mono text-sm font-bold text-[#b45309]">{tawjihi.verification_token}</p>
                  </div>
                  <div className="flex items-end justify-between gap-4 min-[768px]:justify-end">
                    <button
                      type="button"
                      onClick={() => window.print()}
                      className={`print:hidden inline-flex items-center justify-center gap-2 rounded-md bg-primary px-5 py-3 text-sm font-semibold text-white hover:-translate-y-0.5 motion-reduce:hover:translate-y-0 ${EASE}`}
                    >
                      <Printer className="h-4 w-4" aria-hidden />
                      {t("print_pdf")}
                    </button>
                    <QRCodeSVG value={tawjihi.verification_token} size={88} />
                  </div>
                </footer>
              </div>
            ) : (
              <p className="py-10 text-center text-foreground dark:text-zinc-400">{t("empty")}</p>
            )}
          </div>
        </article>
      ) : (
        <section className="space-y-4">
          {degrees.length === 0 ? (
            <p className="rounded-lg border border-white/20 bg-card p-8 text-center text-foreground">{t("degrees_empty")}</p>
          ) : degrees.map((degree) => (
            <article key={degree.id} className={`rounded-lg border border-amber-600/30 bg-card p-6 shadow-sm hover:-translate-y-0.5 hover:shadow-md hover:shadow-emerald-950/5 motion-reduce:hover:translate-y-0 ${EASE}`}>
              <div className="flex items-start justify-between gap-3">
                <GraduationCap className="h-7 w-7 shrink-0 text-[#064e3b] dark:text-emerald-200" aria-hidden />
                <p className="break-all font-mono text-xs font-bold text-[#b45309]">{degree.verification_token}</p>
              </div>
              <h2 className="mt-3 break-words text-xl font-black text-[#064e3b] dark:text-emerald-50">{degree.institution_name}</h2>
              <p className="font-semibold text-[#1c1917] dark:text-zinc-100">{degree.degree_or_stream}</p>
              <p className="mt-1 break-words text-sm text-foreground dark:text-zinc-400">{degree.seat_or_student_number} · {degree.completion_year} · {Number(degree.gpa_or_grade).toFixed(2)}</p>
              <p className="mt-3 inline-flex rounded-full bg-[#064e3b]/10 px-3 py-1 text-xs font-bold text-[#064e3b] dark:text-emerald-100">{t(degree.status) || degree.status}</p>
            </article>
          ))}
          <ProtectedAction className="block" onAction={() => setOpen(true)}>
            <button type="button" className={`flex w-full items-center justify-center gap-3 rounded-md border border-emerald-500/30 bg-primary px-8 py-4 font-semibold text-white hover:-translate-y-0.5 motion-reduce:hover:translate-y-0 ${EASE}`}>
              {t("equivalency")}
            </button>
          </ProtectedAction>
        </section>
      )}
    </div>
  );
}
