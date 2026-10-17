"use client";

import Image from "next/image";
import { useCallback, useEffect, useState } from "react";
import { useTranslations } from "next-intl";
import { usePathname, useRouter } from "@/i18n/routing";
import { Fingerprint, Loader2, ShieldX } from "lucide-react";
import { FormField } from "@/components/ui/FormField";
import { StatusTag } from "@/components/ui/StatusTag";

function formatDate(value, locale) {
  if (!value) return "—";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "—";
  return new Intl.DateTimeFormat(locale === "ar" ? "ar-PS" : "en-GB", {
    year: "numeric",
    month: "long",
    day: "numeric",
  }).format(date);
}

export function VerifyPortal({ locale, initialNationalId = "", initialToken = "" }) {
  const t = useTranslations("Verify");
  const router = useRouter();
  const pathname = usePathname();
  const [nationalId, setNationalId] = useState(initialNationalId);
  const [status, setStatus] = useState(initialNationalId || initialToken ? "loading" : "idle");
  const [result, setResult] = useState(null);
  const [error, setError] = useState("");

  const lookup = useCallback(async (query) => {
    try {
      const response = await fetch(`/api/verify?${query}`, { cache: "no-store" });
      const data = await response.json();
      if (response.ok && data?.valid) {
        setResult(data);
        setStatus("valid");
      } else {
        setResult({ error: data?.error || t("not_found") });
        setStatus("invalid");
      }
    } catch {
      setResult({ error: t("network_error") });
      setStatus("invalid");
    }
  }, [t]);

  useEffect(() => {
    if (initialNationalId) {
      queueMicrotask(() => lookup(`national_id=${encodeURIComponent(initialNationalId)}`));
    } else if (initialToken) {
      queueMicrotask(() => lookup(`token=${encodeURIComponent(initialToken)}`));
    }
  }, [initialNationalId, initialToken, lookup]);

  const onSubmit = (event) => {
    event.preventDefault();
    if (!/^\d{9}$/.test(nationalId)) {
      setError(t("invalid_nid"));
      return;
    }
    setError("");
    setStatus("loading");
    setResult(null);
    router.replace(`${pathname}?national_id=${nationalId}`);
    lookup(`national_id=${nationalId}`);
  };

  return (
    <div className="grid gap-6 min-[900px]:grid-cols-2">
      <form onSubmit={onSubmit} className="grid content-start gap-4 rounded-lg border border-border bg-card p-5">
        <div className="flex items-center gap-2 text-[color:var(--brand-900)]">
          <Fingerprint className="h-5 w-5" aria-hidden />
          <h2 className="text-base font-semibold">{t("lookup_title")}</h2>
        </div>
        <p className="text-sm leading-relaxed text-muted-foreground">{t("lookup_helper")}</p>
        <FormField
          id="verify-national-id"
          label={t("nid_label")}
          helper={t("nid_helper")}
          error={error}
          nationalId
          value={nationalId}
          onChange={(event) => setNationalId(event.target.value)}
          placeholder={t("nid_placeholder")}
        />
        <button
          type="submit"
          disabled={status === "loading"}
          className="inline-flex h-11 items-center justify-center gap-2 rounded-lg bg-[color:var(--brand-900)] px-4 text-sm font-semibold text-white disabled:opacity-60"
        >
          {status === "loading" ? <Loader2 className="h-4 w-4 animate-spin" aria-hidden /> : null}
          {status === "loading" ? t("searching") : t("submit")}
        </button>
        <p className="text-xs leading-relaxed text-muted-foreground">{t("privacy_note")}</p>
      </form>

      <section className="grid content-start gap-4" aria-live="polite">
        {status === "idle" ? (
          <div className="rounded-lg border border-dashed border-border bg-card p-5 text-sm leading-relaxed text-muted-foreground">
            {t("idle")}
          </div>
        ) : null}

        {status === "valid" && result ? (
          <div className="relative overflow-hidden grid gap-4 rounded-lg border border-[color:var(--brand-700)]/40 bg-card p-5">
            {/* Subtle sovereign watermark */}
            <div className="pointer-events-none absolute inset-0 flex items-center justify-center opacity-[0.04]" aria-hidden="true">
              <Image src="/images/branding/palpass-logo.png" alt="" width={220} height={220} className="object-contain" />
            </div>

            <div className="relative z-10 flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                <Image
                  src="/images/branding/palpass-logo.png"
                  alt="PALPASS"
                  width={28}
                  height={28}
                  className="rounded-[22%] ring-1 ring-border shadow-sm bg-background"
                />
                <StatusTag status="active">{t("valid_badge")}</StatusTag>
              </div>
              <Image
                src="/images/branding/palestine-eagle.png"
                alt=""
                width={26}
                height={32}
                className="object-contain opacity-75"
              />
            </div>
            <div>
              <p className="text-xs text-muted-foreground">{t("holder")}</p>
              <p className="mt-1 text-lg font-bold text-foreground">{result.full_name}</p>
            </div>
            <dl className="grid gap-3 min-[480px]:grid-cols-2">
              <Row label={t("nid_label")} value={result.national_id_masked} mono />
              <Row label={t("governorate")} value={result.governorate || "—"} />
              <Row label={t("status_label")} value={result.is_verified ? t("status_verified") : t("status_registered")} />
              <Row label={t("issued_at")} value={formatDate(result.issued_at, locale)} />
            </dl>
            <p className="text-xs leading-relaxed text-muted-foreground">{t("valid_note")}</p>
          </div>
        ) : null}

        {status === "invalid" ? (
          <div className="flex items-start gap-3 rounded-lg border border-[color:var(--danger)]/30 bg-card p-5">
            <ShieldX className="mt-0.5 h-5 w-5 shrink-0 text-[color:var(--danger)]" aria-hidden />
            <div>
              <p className="text-sm font-semibold text-foreground">{t("invalid_title")}</p>
              <p className="mt-1 text-sm leading-relaxed text-muted-foreground">
                {result?.error || t("not_found")}
              </p>
            </div>
          </div>
        ) : null}
      </section>
    </div>
  );
}

function Row({ label, value, mono = false }) {
  return (
    <div>
      <dt className="text-xs text-muted-foreground">{label}</dt>
      <dd className={`mt-1 text-sm font-semibold text-foreground ${mono ? "tabular-nums" : ""}`}>{value}</dd>
    </div>
  );
}
