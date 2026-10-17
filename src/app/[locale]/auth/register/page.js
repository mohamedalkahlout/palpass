"use client";

import { Link, useRouter } from "@/i18n/routing";
import { useLocale } from "next-intl";
import { Button } from "@/components/ui/button";
import { useState, useTransition } from "react";
import { registerCitizen } from "@/app/actions";
import {
  Mail,
  Phone,
  MapPin,
  Map,
  FileText,
  Upload,
  IdCard,
  Loader2,
} from "lucide-react";
import { BrandMark } from "@/components/brand/BrandMark";

const inputClass =
  "block w-full rounded-xl border border-border bg-card text-card-foreground py-3 px-4 sm:text-sm transition focus:outline-none focus:border-primary placeholder:text-muted-foreground/60 rtl:text-right ltr:text-left";

const selectClass =
  "block w-full rounded-xl border border-border bg-popover text-popover-foreground py-3 px-4 sm:text-sm transition focus:outline-none focus:border-primary rtl:text-right ltr:text-left";

const labelClass = "block text-sm font-semibold mb-1 text-foreground rtl:text-right ltr:text-left";
const sublabelClass = "font-normal text-muted-foreground text-xs mx-1";

const CITIES = {
  jerusalem: { ar: "القدس", en: "Jerusalem" },
  ramallah: { ar: "رام الله", en: "Ramallah" },
  gaza: { ar: "غزة", en: "Gaza" },
  hebron: { ar: "الخليل", en: "Hebron" },
  nablus: { ar: "نابلس", en: "Nablus" },
  tulkarm: { ar: "طولكرم", en: "Tulkarm" },
  jenin: { ar: "جنين", en: "Jenin" },
  bethlehem: { ar: "بيت لحم", en: "Bethlehem" },
  jericho: { ar: "أريحا", en: "Jericho" },
  qalqilya: { ar: "قلقيلية", en: "Qalqilya" },
};

const GOVERNORATES = {
  jerusalem: { ar: "القدس", en: "Jerusalem" },
  ramallah: { ar: "رام الله والبيرة", en: "Ramallah & Al-Bireh" },
  hebron: { ar: "الخليل", en: "Hebron" },
  nablus: { ar: "نابلس", en: "Nablus" },
  jenin: { ar: "جنين", en: "Jenin" },
  tulkarm: { ar: "طولكرم", en: "Tulkarm" },
  qalqilya: { ar: "قلقيلية", en: "Qalqilya" },
  salfit: { ar: "سلفيت", en: "Salfit" },
  bethlehem: { ar: "بيت لحم", en: "Bethlehem" },
  jericho: { ar: "أريحا والأغوار", en: "Jericho" },
  tubas: { ar: "طوباس", en: "Tubas" },
  gaza: { ar: "غزة", en: "Gaza" },
  north_gaza: { ar: "شمال غزة", en: "North Gaza" },
  deir_al_balah: { ar: "دير البلح", en: "Deir al-Balah" },
  khan_yunis: { ar: "خان يونس", en: "Khan Yunis" },
  rafah: { ar: "رفح", en: "Rafah" },
};

const i18n = {
  en: {
    title: "National registration",
    subtitle: "Issue your official digital identity across the State of Palestine",
    fullName: "Full Name",
    fullNameSub: "(Arabic only, 3+ words)",
    nid: "National ID Number",
    nidSub: "(9 English digits)",
    phone: "Phone Number",
    phoneSub: "(059 / 056)",
    email: "Email Address",
    emailSub: "(Used to send password)",
    city: "City",
    governorate: "Governorate",
    doc: "Identity Verification Document",
    docSub: "(ID or Birth Certificate)",
    docTitle: "National ID card or official birth certificate",
    photoTitle: "Personal photo for visual face matching",
    photoHelp: "Attach a clear, recent face portrait so civil affairs can match it against your ID document.",
    photoUpload: "Upload face photo",
    photoDesc: "PNG, JPG, WEBP up to 10MB",
    uploadWait: "Upload a file",
    uploadDrag: "or drag and drop",
    uploadDesc: "PNG, JPG, PDF up to 10MB",
    submitLabel: "Create Account",
    submittingLabel: "Encrypting data and uploading sovereign documents...",
    already: "Already have an account?",
    loginLink: "Sign in",
    pwdWarning: "Your password will be auto-generated and sent to this address.",
    select: "Select...",
    errors: {
      fullName: "الاسم الرباعي يجب أن يتكون من ثلاثة مقاطع عربية على الأقل.",
      nationalId: "رقم الهوية الوطنية يجب أن يتكون من 9 أرقام.",
      phone: "رقم الهاتف يجب أن يبدأ بـ 059 أو 056 ويتكون من 10 أرقام.",
      email: "يرجى إدخال بريد إلكتروني صالح.",
      governorate: "يرجى اختيار المحافظة.",
      city: "يرجى اختيار المدينة.",
      document: "يرجى إرفاق وثيقة الهوية الوطنية.",
      personalPhoto: "يرجى إرفاق الصورة الشخصية للتحقق العيني.",
    },
  },
  ar: {
    title: "التسجيل الوطني",
    subtitle: "إصدار هويتك الرقمية الرسمية في دولة فلسطين",
    fullName: "الاسم الرباعي الكامل",
    fullNameSub: "(ثلاثة مقاطع عربية على الأقل)",
    nid: "رقم الهوية الوطنية",
    nidSub: "(9 أرقام إنجليزية)",
    phone: "رقم الهاتف",
    phoneSub: "(059 أو 056)",
    email: "البريد الإلكتروني",
    emailSub: "(سيُستخدم لاستقبال كلمة المرور)",
    city: "المدينة",
    governorate: "المحافظة",
    doc: "وثيقة التحقق من الهوية",
    docSub: "(بطاقة الهوية أو شهادة الميلاد)",
    docTitle: "بطاقة الهوية الوطنية أو شهادة الميلاد الرسمية",
    photoTitle: "الصورة الشخصية للتحقق العيني ومطابقة الملامح",
    photoHelp: "يرجى إرفاق صورة شخصية حديثة وواضحة للوجه لمطابقتها مع بطاقة الهوية من قبل الشؤون المدنية.",
    photoUpload: "رفع صورة الوجه",
    photoDesc: "حتى 10 ميغابايت (PNG, JPG, WEBP)",
    uploadWait: "رفع ملف",
    uploadDrag: "أو اسحب وأفلت",
    uploadDesc: "حتى 10 ميغابايت (PNG, JPG, PDF)",
    submitLabel: "إنشاء حساب",
    submittingLabel: "جاري تشفير البيانات وتدقيق الوثائق السيادية...",
    already: "لديك حساب بالفعل؟",
    loginLink: "تسجيل الدخول",
    pwdWarning: "سيتم إرسال كلمة المرور تلقائياً إلى هذا العنوان.",
    select: "اختر...",
    errors: {
      fullName: "الاسم الرباعي يجب أن يتكون من ثلاثة مقاطع عربية على الأقل.",
      nationalId: "رقم الهوية الوطنية يجب أن يتكون من 9 أرقام.",
      phone: "رقم الهاتف يجب أن يبدأ بـ 059 أو 056 ويتكون من 10 أرقام.",
      email: "يرجى إدخال بريد إلكتروني صالح.",
      governorate: "يرجى اختيار المحافظة.",
      city: "يرجى اختيار المدينة.",
      document: "يرجى إرفاق وثيقة الهوية الوطنية.",
      personalPhoto: "يرجى إرفاق الصورة الشخصية للتحقق العيني.",
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

function validateRegistration(formData, errorsCopy) {
  const errors = {};
  const fullName = String(formData.get("fullName") || "").trim();
  const nationalId = String(formData.get("nationalId") || "").trim();
  const phone = String(formData.get("phone") || "").trim();
  const email = String(formData.get("email") || "").trim();
  const governorate = String(formData.get("governorate") || formData.get("region") || "").trim();
  const city = String(formData.get("city") || "").trim();
  const document = formData.get("document") || formData.get("verificationDoc");
  const personalPhoto = formData.get("personalPhoto");

  const nameWords = fullName.split(/\s+/).filter(Boolean);
  if (nameWords.length < 3 || !/^[\u0600-\u06FF\s]+$/.test(fullName)) {
    errors.fullName = errorsCopy.fullName;
  }
  if (!/^\d{9}$/.test(nationalId)) errors.nationalId = errorsCopy.nationalId;
  if (!/^05[69]\d{7}$/.test(phone)) errors.phone = errorsCopy.phone;
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) errors.email = errorsCopy.email;
  if (!governorate) errors.governorate = errorsCopy.governorate;
  if (!city) errors.city = errorsCopy.city;
  if (!(document instanceof File) || document.size <= 0) errors.document = errorsCopy.document;
  if (!(personalPhoto instanceof File) || personalPhoto.size <= 0) {
    errors.personalPhoto = errorsCopy.personalPhoto;
  }

  return errors;
}

export default function RegisterPage() {
  const locale = useLocale();
  const router = useRouter();
  const t = i18n[locale] || i18n.ar;
  const loc = locale === "en" ? "en" : "ar";

  const [isPending, startTransition] = useTransition();
  const [errorMsg, setErrorMsg] = useState("");
  const [fieldErrors, setFieldErrors] = useState({});
  const [docName, setDocName] = useState("");
  const [docPreview, setDocPreview] = useState("");
  const [photoName, setPhotoName] = useState("");
  const [photoPreview, setPhotoPreview] = useState("");
  const [nidInput, setNidInput] = useState("");
  const [phoneInput, setPhoneInput] = useState("");
  const [nameInput, setNameInput] = useState("");

  const revokePreview = (url) => {
    if (url) URL.revokeObjectURL(url);
  };

  const handleDocChange = (e) => {
    const file = e.target.files?.[0];
    setDocName(file?.name || "");
    revokePreview(docPreview);
    if (file && file.type.startsWith("image/")) {
      setDocPreview(URL.createObjectURL(file));
    } else {
      setDocPreview("");
    }
    if (file && file.size > 0) {
      setFieldErrors((prev) => ({ ...prev, document: undefined }));
    }
  };

  const handlePhotoChange = (e) => {
    const file = e.target.files?.[0];
    setPhotoName(file?.name || "");
    revokePreview(photoPreview);
    if (file && file.type.startsWith("image/")) {
      setPhotoPreview(URL.createObjectURL(file));
    } else {
      setPhotoPreview("");
    }
    if (file && file.size > 0) {
      setFieldErrors((prev) => ({ ...prev, personalPhoto: undefined }));
    }
  };

  const handleNidChange = (e) => {
    const easternDigits = ["٠", "١", "٢", "٣", "٤", "٥", "٦", "٧", "٨", "٩"];
    let val = e.target.value;
    for (let i = 0; i < 10; i++) val = val.replaceAll(easternDigits[i], String(i));
    setNidInput(val.replace(/[^0-9]/g, "").slice(0, 9));
  };
  const handlePhoneChange = (e) => setPhoneInput(e.target.value.replace(/[^0-9]/g, "").slice(0, 10));
  const handleNameChange = (e) => setNameInput(e.target.value.replace(/[^\u0600-\u06FF\s]/g, ""));

  const bothFilesReady = Boolean(docName) && Boolean(photoName);

  const handleRegister = (e) => {
    e.preventDefault();
    if (isPending) return;
    setErrorMsg("");

    const formData = new FormData(e.currentTarget);
    const errors = validateRegistration(formData, t.errors);
    setFieldErrors(errors);
    if (Object.keys(errors).length > 0) return;

    startTransition(async () => {
      try {
        const result = await registerCitizen(formData);
        if (!result?.success) {
          setErrorMsg(result?.error || (locale === "ar" ? "تعذر إتمام التسجيل." : "Registration could not be completed."));
          return;
        }
        const nid = result.nationalId || String(formData.get("nationalId") || "").trim();
        const emailMask = result.maskedEmail || "";
        // replace (not push) — prevents stale history/URL↔DOM lag during handoff
        const loginUrl = `/auth/login?nid=${encodeURIComponent(nid)}&registered=1&emailMask=${encodeURIComponent(emailMask)}${
          result.mailDelivered === false ? "&mailOk=0" : ""
        }`;
        router.replace(loginUrl);
      } catch {
        setErrorMsg(locale === "ar" ? "حدث خطأ غير متوقع. يرجى المحاولة مرة أخرى." : "An unexpected error occurred. Please try again.");
      }
    });
  };

  return (
    <div className="flex min-h-[calc(100vh-160px)] items-center justify-center py-12 px-4 sm:px-6 lg:px-8 bg-background relative overflow-hidden">
      <div className="w-full max-w-lg z-10 rounded-lg border border-border bg-card p-8">
        <div className="mb-8 text-center">
          <div className="mx-auto mb-4 w-fit">
            <BrandMark size={56} href={null} withWordmark={false} />
          </div>
          <h1 className="text-2xl font-black tracking-tight text-foreground">{t.title}</h1>
          <p className="mt-2 text-sm text-muted-foreground">{t.subtitle}</p>
        </div>

        {errorMsg ? (
          <div className="mb-5 p-4 bg-red-100 dark:bg-red-900/40 text-red-700 dark:text-red-400 rounded-xl text-sm font-bold border border-red-200 dark:border-red-800/50 text-center rtl:text-right ltr:text-left">
            {errorMsg}
          </div>
        ) : null}

        <form
          id="register-form"
          className="space-y-5"
          onSubmit={handleRegister}
          noValidate
          dir={locale === "ar" ? "rtl" : "ltr"}
        >
          <div>
            <label htmlFor="fullName" className={labelClass}>
              {t.fullName} <span className={sublabelClass}>{t.fullNameSub}</span>
            </label>
            <input
              id="fullName"
              name="fullName"
              type="text"
              value={nameInput}
              onChange={handleNameChange}
              className={inputClass}
              aria-invalid={Boolean(fieldErrors.fullName)}
              placeholder="أحمد محمد عبدالله عمر"
            />
            <FieldError message={fieldErrors.fullName} />
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label htmlFor="national-id" className={labelClass}>
                {t.nid} <span className={sublabelClass}>{t.nidSub}</span>
              </label>
              <div className="relative">
                <IdCard className="absolute ltr:left-3 rtl:right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground pointer-events-none" />
                <input
                  id="national-id"
                  name="nationalId"
                  type="text"
                  inputMode="numeric"
                  maxLength={9}
                  dir="ltr"
                  value={nidInput}
                  onChange={handleNidChange}
                  className={inputClass + " ltr:pl-9 rtl:pr-9 text-left font-mono"}
                  placeholder="123456789"
                  aria-invalid={Boolean(fieldErrors.nationalId)}
                />
              </div>
              <FieldError message={fieldErrors.nationalId} />
            </div>
            <div>
              <label htmlFor="phone" className={labelClass}>
                {t.phone} <span className={sublabelClass}>{t.phoneSub}</span>
              </label>
              <div className="relative">
                <Phone className="absolute ltr:left-3 rtl:right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground pointer-events-none" />
                <input
                  id="phone"
                  name="phone"
                  type="tel"
                  inputMode="numeric"
                  maxLength={10}
                  dir="ltr"
                  value={phoneInput}
                  onChange={handlePhoneChange}
                  className={inputClass + " ltr:pl-9 rtl:pr-9 text-left font-mono"}
                  placeholder="059xxxxxxx"
                  aria-invalid={Boolean(fieldErrors.phone)}
                />
              </div>
              <FieldError message={fieldErrors.phone} />
            </div>
          </div>

          <div>
            <label htmlFor="email" className={labelClass}>
              {t.email} <span className={sublabelClass}>{t.emailSub}</span>
            </label>
            <div className="relative">
              <Mail className="absolute ltr:left-3 rtl:right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground pointer-events-none" />
              <input
                id="email"
                name="email"
                type="email"
                dir="ltr"
                autoComplete="email"
                className={inputClass + " ltr:pl-9 rtl:pr-9 text-left font-mono"}
                placeholder="you@example.com"
                aria-invalid={Boolean(fieldErrors.email)}
              />
            </div>
            <FieldError message={fieldErrors.email} />
            <p className="text-xs text-primary font-bold mt-2 flex items-center gap-1.5">
              <span className="text-lg">📩</span> {t.pwdWarning}
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label htmlFor="governorate" className={labelClass}>{t.governorate}</label>
              <div className="relative">
                <Map className="absolute ltr:left-3 rtl:right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground pointer-events-none" />
                <select
                  name="governorate"
                  id="governorate"
                  className={selectClass + " ltr:pl-9 rtl:pr-9"}
                  defaultValue=""
                  aria-invalid={Boolean(fieldErrors.governorate)}
                >
                  <option value="" disabled>{t.select}</option>
                  {Object.entries(GOVERNORATES).map(([k, v]) => (
                    <option key={k} value={k}>{v[loc]}</option>
                  ))}
                </select>
              </div>
              <FieldError message={fieldErrors.governorate} />
            </div>
            <div>
              <label htmlFor="city" className={labelClass}>{t.city}</label>
              <div className="relative">
                <MapPin className="absolute ltr:left-3 rtl:right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground pointer-events-none" />
                <select
                  name="city"
                  id="city"
                  className={selectClass + " ltr:pl-9 rtl:pr-9"}
                  defaultValue=""
                  aria-invalid={Boolean(fieldErrors.city)}
                >
                  <option value="" disabled>{t.select}</option>
                  {Object.entries(CITIES).map(([k, v]) => (
                    <option key={k} value={k}>{v[loc]}</option>
                  ))}
                </select>
              </div>
              <FieldError message={fieldErrors.city} />
            </div>
          </div>

          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            {/* Box 1 — National ID / birth certificate */}
            <div>
              <label className={labelClass}>{t.docTitle}</label>
              <div className="mt-1 rounded-lg border-2 border-dashed border-border hover:border-primary/40 transition-colors bg-muted group cursor-pointer overflow-hidden">
                <label htmlFor="document" className="flex flex-col items-center justify-center px-4 py-6 cursor-pointer min-h-[200px]">
                  {docPreview ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img src={docPreview} alt="" className="mb-3 max-h-36 w-auto rounded-lg object-contain border border-border" />
                  ) : (
                    <div className="w-12 h-12 bg-primary/10 rounded-lg flex items-center justify-center mb-3 group-hover:bg-primary/15 transition">
                      {docName ? <FileText className="w-6 h-6 text-primary" /> : <Upload className="w-6 h-6 text-primary" />}
                    </div>
                  )}
                  <span className="text-sm font-semibold text-primary group-hover:text-primary/80 transition text-center px-2">
                    {docName || t.uploadWait}
                  </span>
                  {!docName ? <span className="text-xs text-muted-foreground mt-1">{t.uploadDrag}</span> : null}
                  <span className="text-xs text-muted-foreground mt-2 text-center">{t.uploadDesc}</span>
                  <input
                    id="document"
                    name="document"
                    type="file"
                    className="sr-only"
                    accept="image/png,image/jpeg,application/pdf"
                    onChange={handleDocChange}
                    required
                  />
                </label>
              </div>
              <FieldError message={fieldErrors.document} />
            </div>

            {/* Box 2 — Personal face photo */}
            <div>
              <label className={labelClass}>{t.photoTitle}</label>
              <p className="text-xs text-muted-foreground mb-1 leading-relaxed">{t.photoHelp}</p>
              <div className="mt-1 rounded-lg border-2 border-dashed border-border hover:border-primary/40 transition-colors bg-muted group cursor-pointer overflow-hidden">
                <label htmlFor="personalPhoto" className="flex flex-col items-center justify-center px-4 py-6 cursor-pointer min-h-[200px]">
                  {photoPreview ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img
                      src={photoPreview}
                      alt=""
                      className="mb-3 h-28 w-28 rounded-full object-cover ring-4 ring-primary/20 border border-border"
                    />
                  ) : (
                    <div className="w-12 h-12 bg-primary/10 rounded-lg flex items-center justify-center mb-3 group-hover:bg-primary/15 transition">
                      <IdCard className="w-6 h-6 text-primary" />
                    </div>
                  )}
                  <span className="text-sm font-semibold text-primary group-hover:text-primary/80 transition text-center px-2">
                    {photoName || t.photoUpload}
                  </span>
                  {!photoName ? <span className="text-xs text-muted-foreground mt-1">{t.uploadDrag}</span> : null}
                  <span className="text-xs text-muted-foreground mt-2 text-center">{t.photoDesc}</span>
                  <input
                    id="personalPhoto"
                    name="personalPhoto"
                    type="file"
                    className="sr-only"
                    accept="image/png,image/jpeg,image/webp"
                    onChange={handlePhotoChange}
                    required
                  />
                </label>
              </div>
              <FieldError message={fieldErrors.personalPhoto} />
            </div>
          </div>

          <div className="pt-4">
            <Button
              type="submit"
              id="register-submit-btn"
              disabled={isPending || !bothFilesReady}
              className="group relative flex w-full justify-center rounded-lg py-6 text-lg font-bold transition hover:-translate-y-0.5"
            >
              {isPending ? (
                <span className="inline-flex items-center gap-2">
                  <Loader2 className="h-5 w-5 animate-spin" />
                  {t.submittingLabel}
                </span>
              ) : (
                t.submitLabel
              )}
            </Button>
          </div>
        </form>

        <div className="mt-8 text-center text-sm font-medium text-muted-foreground">
          {t.already}{" "}
          <Link href="/auth/login" className="font-bold text-primary hover:text-primary/80 transition ms-1 border-b-2 border-primary/20 hover:border-primary">
            {t.loginLink}
          </Link>
        </div>
      </div>
    </div>
  );
}
