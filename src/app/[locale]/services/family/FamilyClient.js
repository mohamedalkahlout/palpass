"use client";

import { useEffect, useState } from "react";
import { useTranslations } from "next-intl";
import { Copy, ShieldCheck } from "lucide-react";
import { OfficialCrest } from "@/components/brand/BrandMark";
import Image from "next/image";
import { ModernTatreezAccent } from "@/components/ui/ModernTatreezAccent";
import { TatreezDivider } from "@/components/ui/TatreezDivider";
import ProtectedAction from "@/components/auth/ProtectedAction";
import { SovereignConfirmModal } from "@/components/ui/SovereignConfirmModal";
import { useAuth } from "@/components/auth/AuthProvider";
import { createClient } from "@/lib/supabase/client";
import { submitServiceRequest } from "@/app/actions";
import { toast } from "sonner";

const EASE = "transition-all duration-[250ms] ease-[cubic-bezier(0.16,1,0.3,1)] motion-reduce:transition-none";

function initials(name) {
  return String(name || "")
    .trim()
    .split(/\s+/)
    .slice(0, 2)
    .map((part) => part[0])
    .join("");
}

export function FamilyClient({ members = [] }) {
  const t = useTranslations("FamilyBook");
  const { user } = useAuth();
  const [head, setHead] = useState(null);
  const [copied, setCopied] = useState("");
  const [mode, setMode] = useState(null);
  const [sending, setSending] = useState(false);

  useEffect(() => {
    if (!user?.id) return undefined;
    let cancelled = false;
    const supabase = createClient();
    supabase
      .from("profiles")
      .select("full_name, national_id")
      .eq("id", user.id)
      .maybeSingle()
      .then(({ data }) => {
        if (!cancelled) setHead(data || null);
      });
    return () => {
      cancelled = true;
    };
  }, [user?.id]);

  const confirm = async () => {
    setSending(true);
    const result = await submitServiceRequest(mode === "birth" ? "birth_registration" : "family_extract", t(mode === "birth" ? "birth_event" : "extract"));
    setSending(false);
    setMode(null);
    if (result?.success) toast.success(t("sent"));
    else toast.error(result?.error || t("empty"));
  };

  const copyNid = async (nid) => {
    try {
      await navigator.clipboard.writeText(nid);
      setCopied(nid);
      toast.success(t("copied"));
    } catch {
      setCopied("");
    }
  };

  return (
    <div className="space-y-6">
      {/* Family Registry Showcase Banner */}
      <div className="relative h-44 sm:h-56 w-full rounded-2xl overflow-hidden border border-emerald-950/10 dark:border-white/10 shadow-sm">
        <Image
          src="/images/civic/family-registry.webp"
          alt="Palestine Family Registry"
          fill
          priority
          sizes="(max-width: 1024px) 100vw, 800px"
          className="object-cover"
        />
        <div className="absolute inset-0 bg-gradient-to-t from-background/90 via-background/25 to-transparent" />
        <div className="absolute bottom-4 start-5 end-5">
          <span className="text-xs font-bold text-primary block">السجل المدني الوطني الموحد &bull; دولة فلسطين</span>
          <p className="text-sm font-semibold text-foreground mt-0.5">
            دفتر العائلة الرقمي وبيانات النفوس والروابط الأسرية المعتمدة
          </p>
        </div>
      </div>

      <ModernTatreezAccent variant="ribbon" className="opacity-15 dark:opacity-5" />

      <header className="rounded-lg border border-border bg-card p-4 text-foreground sm:p-5">
        <div>
          <p className="text-base font-bold text-foreground">{t("cover_title")}</p>
        </div>
        <dl className="relative mt-6 grid grid-cols-1 gap-3 text-sm min-[640px]:grid-cols-3">
          <div className="min-w-0 rounded-lg border border-border bg-muted p-3">
            <dt className="text-xs text-muted-foreground">{t("quad_name")}</dt>
            <dd className="mt-1 break-words font-bold">{head?.full_name || "—"}</dd>
            <p className="mt-1 text-[11px] text-[#d97706]">{t("head")}</p>
          </div>
          <div className="min-w-0 rounded-lg border border-border bg-muted p-3">
            <dt className="text-xs text-muted-foreground">{t("nid")}</dt>
            <dd className="mt-1 font-mono font-bold tracking-wide">{head?.national_id || "—"}</dd>
          </div>
          <div className="min-w-0 rounded-lg border border-border bg-muted p-3">
            <dt className="text-xs text-muted-foreground">{t("booklet_date")}</dt>
            <dd className="mt-1 font-bold">{t("registry")}</dd>
          </div>
        </dl>
      </header>

      <TatreezDivider />

      {members.length === 0 ? <p className="text-center text-foreground dark:text-zinc-400">{t("empty")}</p> : members.map((member) => (
        <article key={member.id} className={`rounded-lg border bg-card p-5 shadow-sm hover:-translate-y-0.5 hover:shadow-md hover:shadow-emerald-950/5 motion-reduce:hover:translate-y-0 ${EASE} border-border`}>
          <div className="flex items-start gap-4">
            <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-md bg-primary text-sm font-black text-white" aria-hidden>
              {initials(member.member_name)}
            </div>
            <div className="min-w-0 flex-1">
              <span className="inline-flex rounded-full border border-amber-600/40 bg-amber-50 px-2.5 py-0.5 text-xs font-bold text-[#b45309] dark:bg-amber-950/40">{t(member.relationship)}</span>
              <h2 className="mt-2 break-words text-xl font-black text-[#064e3b] dark:text-emerald-50">{member.member_name}</h2>
            </div>
          </div>
          <dl className="mt-4 grid grid-cols-1 gap-3 text-sm min-[640px]:grid-cols-2">
            <div className="min-w-0">
              <dt className="text-xs text-muted-foreground">{t("nid")}</dt>
              <dd className="mt-1 flex flex-wrap items-center gap-2">
                <span className="rounded-full bg-[#f5f5f4] px-3 py-1 font-mono font-bold text-[#1c1917] dark:bg-zinc-800 dark:text-zinc-100">{member.member_nid}</span>
                <button type="button" onClick={() => copyNid(member.member_nid)} className={`inline-flex items-center gap-1 rounded-full border border-emerald-900/15 px-2.5 py-1 text-xs font-semibold text-[#064e3b] hover:bg-emerald-800/5 dark:text-emerald-100 ${EASE}`}>
                  <Copy className="h-3.5 w-3.5" aria-hidden />
                  {copied === member.member_nid ? t("copied") : t("copy")}
                </button>
              </dd>
            </div>
            <div>
              <dt className="text-xs text-muted-foreground">{t("birth")}</dt>
              <dd className="mt-1 font-bold text-[#1c1917] dark:text-zinc-100">{member.birth_date}</dd>
            </div>
            <div>
              <dt className="text-xs text-muted-foreground">{t("blood")}</dt>
              <dd className="mt-1">
                <span className="inline-flex rounded-full border border-[#dc2626]/25 bg-[#dc2626]/10 px-2.5 py-0.5 text-sm font-black text-[#dc2626]">{member.blood_type || "—"}</span>
              </dd>
            </div>
            <div>
              <dt className="text-xs text-muted-foreground">{t("insured")}</dt>
              <dd className="mt-1">
                {member.national_health_insured ? (
                  <span className="inline-flex items-center gap-2 text-sm font-bold text-[#064e3b] dark:text-emerald-100">
                    <span className="h-2.5 w-2.5 animate-pulse rounded-full bg-emerald-500 shadow-[0_0_8px_#047857] motion-reduce:animate-none" aria-hidden />
                    <ShieldCheck className="h-4 w-4 text-[#047857]" aria-hidden />
                    {t("insurance_live")}
                  </span>
                ) : (
                  <span className="font-bold text-foreground">{t("uninsured")}</span>
                )}
              </dd>
            </div>
          </dl>
        </article>
      ))}

      <div className="grid grid-cols-1 gap-3 min-[640px]:grid-cols-2">
        <ProtectedAction className="block" onAction={() => setMode("extract")}>
          <button type="button" className={`flex w-full items-center justify-center rounded-md border border-emerald-500/30 bg-primary px-4 py-4 text-sm font-semibold text-white hover:-translate-y-0.5 motion-reduce:hover:translate-y-0 ${EASE}`}>
            {t("extract")}
          </button>
        </ProtectedAction>
        <ProtectedAction className="block" onAction={() => setMode("birth")}>
          <button type="button" className={`flex w-full items-center justify-center rounded-md border border-amber-600/40 bg-card px-4 py-4 text-sm font-semibold text-[#064e3b] hover:-translate-y-0.5 hover:shadow-md motion-reduce:hover:translate-y-0 dark:text-emerald-50 ${EASE}`}>
            {t("birth_event")}
          </button>
        </ProtectedAction>
      </div>
    </div>
  );
}
