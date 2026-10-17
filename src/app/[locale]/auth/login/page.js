"use client";

import { Link, useRouter } from "@/i18n/routing";
import { useLocale } from "next-intl";
import { useSearchParams } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Suspense, useEffect, useRef, useState, useTransition } from "react";
import { signIn, forgotPassword } from "@/app/actions";
import { Eye, EyeOff, X, KeyRound, Fingerprint, Loader2, ShieldCheck } from "lucide-react";
import { BrandMark } from "@/components/brand/BrandMark";

const GENERIC_FORGOT =
  "إذا كان رقم الهوية مسجلاً لدينا، فستصلك تعليمات استعادة الدخول إلى بريدك الإلكتروني.";

const MAIL_FAILED_AR =
  "تعذر تسليم البريد الإلكتروني لحظياً بسبب مزود الخدمة";

const i18n = {
  en: {
    title: "Sign in to PALPASS",
    subtitle: "Secure access to the national digital identity of the State of Palestine",
    nid: "National ID",
    nidSub: "(9 English digits)",
    pwd: "Password",
    pwdSub: "(Sent to your email)",
    loginBtn: "Sign In",
    loginWait: "جاري التحقق من السجل الرقمي...",
    forgotLink: "Forgot Password?",
    noAccount: "Don't have an account?",
    registerLink: "Create an account",
    errorUnx: "An unexpected error occurred. Please try again.",
    nidError: "National ID must be exactly 9 digits.",
    pwdError: "Password is required.",
    wrongPwdHint: "If you did not receive your password email, use Forgot Password below.",
    mailFailed:
      "Email could not be delivered right now due to the mail provider. Your password was still reset — try Forgot Password again later or contact civil affairs.",
    forgot: {
      title: "Reset Password",
      desc: "Enter your 9-digit National ID. If it is registered, recovery instructions will be sent to the linked email.",
      nidSub: "(9 digits)",
      sendBtn: "Send recovery instructions",
      sendWait: "جاري التحقق من السجل الرقمي...",
      resendWait: "Resend in ({seconds}s)",
      success: GENERIC_FORGOT,
    },
  },
  ar: {
    title: "الدخول إلى المنظومة",
    subtitle: "دخول آمن بالهوية الوطنية المكوّنة من تسعة أرقام — دولة فلسطين",
    nid: "رقم الهوية الوطنية",
    nidSub: "(9 أرقام إنجليزية)",
    pwd: "كلمة المرور",
    pwdSub: "(التي أُرسلت إلى بريدك)",
    loginBtn: "تسجيل الدخول",
    loginWait: "جاري التحقق من السجل الرقمي...",
    forgotLink: "نسيت كلمة المرور؟",
    noAccount: "ليس لديك حساب؟",
    registerLink: "إنشاء حساب جديد",
    errorUnx: "حدث خطأ غير متوقع. يرجى المحاولة مرة أخرى.",
    nidError: "رقم الهوية يجب أن يتكون من 9 أرقام.",
    pwdError: "كلمة المرور مطلوبة.",
    wrongPwdHint: "إذا لم يصلك بريد كلمة المرور، استخدم «نسيت كلمة المرور؟» أدناه.",
    mailFailed: MAIL_FAILED_AR,
    forgot: {
      title: "إعادة تعيين كلمة المرور",
      desc: "أدخل رقم الهوية المكوّن من 9 أرقام. إذا كان مسجلاً لدينا ستصلك تعليمات الاستعادة إلى البريد المرتبط.",
      nidSub: "(9 أرقام)",
      sendBtn: "إرسال تعليمات الاستعادة",
      sendWait: "جاري التحقق من السجل الرقمي...",
      resendWait: "إعادة الإرسال بعد ({seconds} ثانية)",
      success: GENERIC_FORGOT,
    },
  },
};

function FieldError({ message }) {
  if (!message) return null;
  return (
    <p className="mt-1.5 text-xs font-bold text-red-600 dark:text-red-400 rtl:text-right ltr:text-left" role="alert">
      {message}
    </p>
  );
}

function LoginPageContent() {
  const router = useRouter();
  const locale = useLocale();
  const searchParams = useSearchParams();
  const t = i18n[locale] || i18n.ar;
  const passwordRef = useRef(null);

  const registered = searchParams.get("registered") === "1";
  const handoffNid = searchParams.get("nid") || "";
  const emailMask = searchParams.get("emailMask") || "";
  const mailOk = searchParams.get("mailOk") !== "0";
  const nidLocked = registered && /^\d{9}$/.test(handoffNid);

  const [isPending, startTransition] = useTransition();
  const [errorMsg, setErrorMsg] = useState("");
  const [nidError, setNidError] = useState("");
  const [pwdError, setPwdError] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [nidInput, setNidInput] = useState(handoffNid);

  if (nidLocked && handoffNid && handoffNid !== nidInput) {
    setNidInput(handoffNid);
  }

  useEffect(() => {
    if (registered && passwordRef.current) {
      passwordRef.current.focus();
    }
  }, [registered]);

  const [showForgot, setShowForgot] = useState(false);
  const [forgotNid, setForgotNid] = useState("");
  const [forgotNidError, setForgotNidError] = useState("");
  const [forgotPending, startForgot] = useTransition();
  const [forgotMsg, setForgotMsg] = useState({ type: "", text: "" });
  const [forgotCooldown, setForgotCooldown] = useState(() => {
    if (typeof window === "undefined") return 0;
    try {
      const savedExpire = localStorage.getItem("palpass_forgot_cooldown_until");
      if (savedExpire) {
        const remaining = Math.ceil((Number(savedExpire) - Date.now()) / 1000);
        if (remaining > 0) return remaining;
        localStorage.removeItem("palpass_forgot_cooldown_until");
      }
    } catch {
      // LocalStorage not available or blocked
    }
    return 0;
  });

  useEffect(() => {
    if (forgotCooldown <= 0) return;
    const interval = setInterval(() => {
      setForgotCooldown((prev) => {
        if (prev <= 1) {
          try {
            localStorage.removeItem("palpass_forgot_cooldown_until");
          } catch {}
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
    return () => clearInterval(interval);
  }, [forgotCooldown]);

  const handleNidChange = (e) => {
    if (nidLocked) return;
    const easternDigits = ["٠", "١", "٢", "٣", "٤", "٥", "٦", "٧", "٨", "٩"];
    let val = e.target.value;
    for (let i = 0; i < 10; i++) val = val.replaceAll(easternDigits[i], String(i));
    setNidInput(val.replace(/[^0-9]/g, "").slice(0, 9));
  };

  const handleForgotNidChange = (e) => {
    const easternDigits = ["٠", "١", "٢", "٣", "٤", "٥", "٦", "٧", "٨", "٩"];
    let val = e.target.value;
    for (let i = 0; i < 10; i++) val = val.replaceAll(easternDigits[i], String(i));
    setForgotNid(val.replace(/[^0-9]/g, "").slice(0, 9));
  };

  const handleLogin = (e) => {
    e.preventDefault();
    if (isPending) return;
    setErrorMsg("");
    setNidError("");
    setPwdError("");

    const formData = new FormData(e.currentTarget);
    const next = searchParams.get("next");
    if (next) formData.set("next", next);
    const nationalId = String(formData.get("nationalId") || "").trim();
    const password = String(formData.get("password") || "");

    let invalid = false;
    if (!/^\d{9}$/.test(nationalId)) {
      setNidError(t.nidError);
      invalid = true;
    }
    if (!password) {
      setPwdError(t.pwdError);
      invalid = true;
    }
    if (invalid) return;

    startTransition(async () => {
      try {
        const result = await signIn(formData);
        if (!result?.success) {
          const err = result?.error || t.errorUnx;
          const isWrongPwd = err.includes("كلمة المرور غير صحيحة") || /incorrect|password/i.test(err);
          setErrorMsg(isWrongPwd ? `${err} ${t.wrongPwdHint}` : err);
          if (isWrongPwd) setShowForgot(true);
          return;
        }
        router.push(result.redirectUrl || "/dashboard");
      } catch {
        setErrorMsg(t.errorUnx);
      }
    });
  };

  const handleForgotPassword = (e) => {
    e.preventDefault();
    if (forgotPending || forgotCooldown > 0) return;
    setForgotMsg({ type: "", text: "" });
    setForgotNidError("");

    const cleanNid = forgotNid.trim();
    if (!/^\d{9}$/.test(cleanNid)) {
      setForgotNidError(t.nidError);
      return;
    }

    const fd = new FormData();
    fd.append("nationalId", cleanNid);

    startForgot(async () => {
      try {
        const result = await forgotPassword(fd);
        if (result?.success === false) {
          setForgotMsg({
            type: "error",
            text: result?.error || t.errorUnx,
          });
          return;
        }

        // Start 60-second cooldown upon dispatch
        const expireTime = Date.now() + 60000;
        try {
          localStorage.setItem("palpass_forgot_cooldown_until", String(expireTime));
        } catch {}
        setForgotCooldown(60);

        const mailFailed = result?.mailDelivered === false;
        setForgotMsg({
          type: mailFailed ? "error" : "success",
          text: mailFailed
            ? result?.warning || result?.message || t.mailFailed
            : result?.message || t.forgot.success,
        });
      } catch {
        setForgotMsg({ type: "success", text: t.forgot.success });
      }
    });
  };

  return (
    <>
      {showForgot ? (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4" dir={locale === "ar" ? "rtl" : "ltr"}>
          <div className="w-full max-w-sm relative rounded-lg border border-border bg-card p-8">
            <button
              type="button"
              onClick={() => {
                setShowForgot(false);
                setForgotMsg({ type: "", text: "" });
                setForgotNid("");
                setForgotNidError("");
              }}
              className="absolute top-4 ltr:right-4 rtl:left-4 text-muted-foreground hover:text-foreground transition"
              aria-label={locale === "ar" ? "إغلاق" : "Close"}
            >
              <X className="w-5 h-5" />
            </button>

            <div className="flex flex-col items-center mb-6 text-center">
              <div className="w-14 h-14 bg-primary/10 rounded-lg flex items-center justify-center mb-4 ring-1 ring-primary/20">
                <KeyRound className="w-7 h-7 text-primary" />
              </div>
              <h3 className="text-xl font-black text-foreground">{t.forgot.title}</h3>
            </div>

            <p className="text-sm text-muted-foreground text-center mb-6 leading-relaxed">{t.forgot.desc}</p>

            <form onSubmit={handleForgotPassword} noValidate className="space-y-4">
              <div>
                <label htmlFor="forgot-nid" className="block text-sm font-semibold mb-1 ltr:text-left rtl:text-right">
                  {t.nid} <span className="text-muted-foreground font-normal mx-1">{t.forgot.nidSub}</span>
                </label>
                <input
                  id="forgot-nid"
                  name="nationalId"
                  type="text"
                  inputMode="numeric"
                  maxLength={9}
                  value={forgotNid}
                  onChange={handleForgotNidChange}
                  dir="ltr"
                  className="block w-full rounded-xl border border-border bg-black/5 dark:bg-white/5 py-3 px-4 text-foreground font-mono transition focus:outline-none focus:border-primary text-center tracking-widest text-lg"
                  placeholder="123456789"
                  aria-invalid={Boolean(forgotNidError)}
                />
                <FieldError message={forgotNidError} />
              </div>

              {forgotMsg.text ? (
                <div
                  className={`p-3 rounded-xl text-sm font-bold text-center ${
                    forgotMsg.type === "error"
                      ? "bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400 border border-red-200 dark:border-red-800/50"
                      : "bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400 border border-green-200 dark:border-green-800/50"
                  }`}
                >
                  {forgotMsg.text}
                </div>
              ) : null}

              <Button
                type="submit"
                disabled={forgotPending || forgotCooldown > 0}
                className="w-full rounded-lg py-6 text-base font-bold"
              >
                {forgotPending ? (
                  <span className="inline-flex items-center gap-2">
                    <Loader2 className="h-4 w-4 animate-spin" />
                    {t.forgot.sendWait}
                  </span>
                ) : forgotCooldown > 0 ? (
                  (t.forgot.resendWait || "إعادة الإرسال بعد ({seconds} ثانية)").replace("{seconds}", String(forgotCooldown))
                ) : (
                  t.forgot.sendBtn
                )}
              </Button>
            </form>
          </div>
        </div>
      ) : null}

      <div className="flex min-h-[calc(100vh-160px)] items-center justify-center py-12 px-4 sm:px-6 lg:px-8 bg-background relative overflow-hidden" dir={locale === "ar" ? "rtl" : "ltr"}>
        <div className="w-full max-w-md z-10 rounded-lg border border-border bg-card p-8">
          <div className="flex flex-col items-center mb-8 text-center">
            <div className="mb-4">
              <BrandMark size={56} href={null} withWordmark={false} />
            </div>
            <h1 className="text-3xl font-black tracking-tight text-foreground">{t.title}</h1>
            <p className="mt-2 text-base font-medium text-muted-foreground">{t.subtitle}</p>
          </div>

          {registered && nidLocked ? (
            <div className="mb-5 p-4 rounded-xl border border-emerald-500/30 bg-emerald-50 dark:bg-emerald-950/30 text-sm font-bold text-emerald-900 dark:text-emerald-100 leading-relaxed flex gap-3 items-start">
              <ShieldCheck className="w-5 h-5 shrink-0 mt-0.5 text-emerald-700 dark:text-emerald-300" />
              <span>
                {locale === "ar"
                  ? `تم تسجيل بياناتك وإصدار الهوية الرقمية بنجاح. تم إرسال كلمة المرور المعتمدة إلى بريدك الإلكتروني (${emailMask || "••••@••••"}). يرجى إدخال كلمة المرور لإتمام الدخول.`
                  : `Registration succeeded. Your approved password was sent to ${emailMask || "your email"}. Enter it below to sign in.`}
                {!mailOk ? (
                  <span className="block mt-2 text-amber-800 dark:text-amber-200 font-semibold">
                    {locale === "ar" ? MAIL_FAILED_AR : t.mailFailed}
                  </span>
                ) : null}
              </span>
            </div>
          ) : null}

          {errorMsg ? (
            <div className="mb-5 p-4 bg-red-100 dark:bg-red-900/40 text-red-700 dark:text-red-400 rounded-xl text-sm font-bold border border-red-200 dark:border-red-800/50 text-center">
              {errorMsg}
            </div>
          ) : null}

          <form className="space-y-6" onSubmit={handleLogin} noValidate>
            <div>
              <label htmlFor="national-id" className="block text-sm font-semibold mb-2 text-foreground rtl:text-right ltr:text-left">
                {t.nid} <span className="font-normal text-muted-foreground mx-1">{t.nidSub}</span>
              </label>
              <div className="relative">
                <Fingerprint className="absolute ltr:left-4 rtl:right-4 top-1/2 -translate-y-1/2 w-5 h-5 text-primary pointer-events-none" />
                <input
                  id="national-id"
                  name="nationalId"
                  type="text"
                  inputMode="numeric"
                  maxLength={9}
                  value={nidInput}
                  onChange={handleNidChange}
                  readOnly={nidLocked}
                  aria-readonly={nidLocked}
                  dir="ltr"
                  className={`block w-full rounded-lg border py-4 ltr:pl-12 rtl:pr-12 ltr:pr-4 rtl:pl-4 text-foreground font-mono text-lg transition focus:outline-none focus:border-primary ${
                    nidLocked
                      ? "border-emerald-500/40 bg-emerald-500/5 cursor-default"
                      : "border-border bg-muted focus:bg-transparent"
                  }`}
                  placeholder="123456789"
                  aria-invalid={Boolean(nidError)}
                />
              </div>
              <FieldError message={nidError} />
            </div>

            <div>
              <div className="flex items-center justify-between mb-2">
                <label htmlFor="password" className="block text-sm font-semibold text-foreground rtl:text-right ltr:text-left flex-1">
                  {t.pwd} <span className="font-normal text-muted-foreground mx-1">{t.pwdSub}</span>
                </label>
              </div>
              <div className="relative">
                <input
                  ref={passwordRef}
                  id="password"
                  name="password"
                  type={showPassword ? "text" : "password"}
                  autoComplete="current-password"
                  dir="ltr"
                  className="block w-full rounded-lg border border-border bg-muted py-4 ltr:pl-5 rtl:pr-5 ltr:pr-12 rtl:pl-12 text-foreground font-mono text-lg transition focus:outline-none focus:border-primary focus:bg-transparent tracking-widest"
                  placeholder="••••••••••••"
                  aria-invalid={Boolean(pwdError)}
                />
                <button
                  type="button"
                  onClick={() => setShowPassword((v) => !v)}
                  className="absolute ltr:right-4 rtl:left-4 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition p-1"
                  aria-label={showPassword ? (locale === "ar" ? "إخفاء كلمة المرور" : "Hide password") : (locale === "ar" ? "إظهار كلمة المرور" : "Show password")}
                >
                  {showPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                </button>
              </div>
              <FieldError message={pwdError} />
              <button
                type="button"
                onClick={() => setShowForgot(true)}
                className="mt-3 text-sm font-bold text-primary hover:text-primary/80 transition ltr:float-right rtl:float-left border-b-2 border-transparent hover:border-primary pb-0.5"
              >
                {t.forgotLink}
              </button>
              <div className="clear-both" />
            </div>

            <div className="pt-2">
              <Button
                type="submit"
                id="login-submit-btn"
                disabled={isPending}
                className="group relative flex w-full justify-center rounded-lg py-7 text-lg font-bold transition hover:-translate-y-0.5"
              >
                {isPending ? (
                  <span className="inline-flex items-center gap-2">
                    <Loader2 className="h-5 w-5 animate-spin" />
                    {t.loginWait}
                  </span>
                ) : (
                  t.loginBtn
                )}
              </Button>
            </div>
          </form>

          <div className="mt-8 text-center text-sm font-medium text-muted-foreground border-t border-border/50 pt-6">
            {t.noAccount}{" "}
            <Link
              href="/auth/register"
              className="font-bold text-primary hover:text-primary/80 transition ms-1 border-b-2 border-primary/20 hover:border-primary pb-0.5"
            >
              {t.registerLink}
            </Link>
          </div>
        </div>
      </div>
    </>
  );
}

export default function LoginPage() {
  return (
    <Suspense fallback={null}>
      <LoginPageContent />
    </Suspense>
  );
}
