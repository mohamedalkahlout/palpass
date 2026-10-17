"use client";

import { useState } from "react";
import { useTranslations } from "next-intl";
import { Link } from "@/i18n/routing";
import { NationalEmblem } from "@/components/brand/SovereignMarks";
import { Button } from "@/components/ui/button";
import { useDialogKeys } from "@/components/ui/useDialogKeys";
import { forgotPassword, signIn } from "@/app/actions";
import { Loader2 } from "lucide-react";

export function GuestAuthModal({ open, onClose, onAuthenticated, title, description }) {
  const t = useTranslations("GuestAuth");
  const [mode, setMode] = useState("login");
  const [nationalId, setNationalId] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [info, setInfo] = useState("");
  const [pending, setPending] = useState(false);
  const dialogRef = useDialogKeys(open, onClose);

  if (!open) return null;

  const submitLogin = async (event) => {
    event.preventDefault();
    setError("");
    setInfo("");
    setPending(true);
    const formData = new FormData();
    formData.set("nationalId", nationalId.trim());
    formData.set("password", password);
    const result = await signIn(formData);
    setPending(false);
    if (!result?.success) {
      setError(result?.error || t("failed"));
      return;
    }
    await onAuthenticated();
  };

  const submitForgot = async (event) => {
    event.preventDefault();
    setError("");
    setInfo("");
    setPending(true);
    const formData = new FormData();
    formData.set("nationalId", nationalId.trim());
    const result = await forgotPassword(formData);
    setPending(false);
    setInfo(result?.message || t("forgot_sent"));
  };

  return (
    <div className="fixed inset-0 z-[80] flex items-end justify-center bg-[#0c0f0e]/50 p-4 sm:items-center" role="presentation" onClick={onClose}>
      <div
        ref={dialogRef}
        tabIndex={-1}
        role="dialog"
        aria-modal="true"
        aria-labelledby="guest-auth-title"
        className="w-full max-w-md rounded-lg border border-border bg-card p-6 outline-none"
        onClick={(event) => event.stopPropagation()}
      >
        <div className="mb-4 flex items-center gap-3">
          <NationalEmblem className="h-12 w-10 shrink-0" />
          <div>
            <h2 id="guest-auth-title" className="text-xl font-black text-foreground">
              {title || t("title")}
            </h2>
            <p className="mt-1 text-sm leading-relaxed text-muted-foreground">{description || t("description")}</p>
          </div>
        </div>

        {mode === "forgot" ? (
          <form onSubmit={submitForgot} className="space-y-3">
            <label className="block text-sm font-semibold" htmlFor="guest-forgot-nid">
              {t("national_id")}
            </label>
            <input
              id="guest-forgot-nid"
              name="nationalId"
              inputMode="numeric"
              autoComplete="username"
              value={nationalId}
              onChange={(event) => setNationalId(event.target.value)}
              className="h-11 w-full rounded-sm border border-border bg-card px-3"
              dir="ltr"
            />
            {info ? <p className="text-sm font-medium text-primary">{info}</p> : null}
            {error ? <p className="text-sm font-medium text-red-600">{error}</p> : null}
            <Button type="submit" disabled={pending} className="h-11 w-full rounded-lg font-semibold">
              {pending ? <Loader2 className="h-4 w-4 animate-spin" /> : t("send_reset")}
            </Button>
            <button type="button" className="w-full text-sm font-semibold text-primary" onClick={() => setMode("login")}>
              {t("back_login")}
            </button>
          </form>
        ) : (
          <form onSubmit={submitLogin} className="space-y-3">
            <label className="block text-sm font-semibold" htmlFor="guest-nid">
              {t("national_id")}
            </label>
            <input
              id="guest-nid"
              name="nationalId"
              inputMode="numeric"
              autoComplete="username"
              value={nationalId}
              onChange={(event) => setNationalId(event.target.value)}
              className="h-11 w-full rounded-sm border border-border bg-card px-3"
              dir="ltr"
            />
            <label className="block text-sm font-semibold" htmlFor="guest-password">
              {t("password")}
            </label>
            <input
              id="guest-password"
              name="password"
              type="password"
              autoComplete="current-password"
              value={password}
              onChange={(event) => setPassword(event.target.value)}
              className="h-11 w-full rounded-sm border border-border bg-card px-3"
              dir="ltr"
            />
            {error ? <p className="text-sm font-medium text-red-600">{error}</p> : null}
            <Button type="submit" disabled={pending} className="h-11 w-full rounded-lg font-semibold">
              {pending ? <Loader2 className="h-4 w-4 animate-spin" /> : t("login")}
            </Button>
            <Button asChild variant="outline" className="h-11 w-full rounded-lg font-semibold">
              <Link href="/auth/register">{t("register")}</Link>
            </Button>
            <button type="button" className="w-full text-sm font-semibold text-primary" onClick={() => setMode("forgot")}>
              {t("forgot")}
            </button>
          </form>
        )}

        <button type="button" className="mt-4 w-full text-sm text-muted-foreground" onClick={onClose}>
          {t("close")}
        </button>
      </div>
    </div>
  );
}
