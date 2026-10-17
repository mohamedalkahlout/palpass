import { getTranslations } from "next-intl/server";
import { Link } from "@/i18n/routing";
import { BrandMark, EagleWatermark, OfficialCrest } from "@/components/brand/BrandMark";
import { ShieldCheck, MailWarning } from "lucide-react";

export default async function PendingReviewPage({ searchParams }) {
  const t = await getTranslations("Auth");
  const commonT = await getTranslations("Common");
  const params = await searchParams;
  const mailFailed =
    params?.mail === "failed" ||
    params?.mailDelivered === "0" ||
    params?.mailDelivered === "false";

  return (
    <div className="relative min-h-[calc(100vh-160px)] flex items-center justify-center p-6 bg-background overflow-hidden">
      <EagleWatermark opacity={0.07} />

      <article className="relative z-10 w-full max-w-lg overflow-hidden rounded-lg border border-border bg-card p-8 sm:p-10 text-center">
        <div className="mx-auto mb-5 w-fit">
          <BrandMark size={64} href={null} withWordmark={false} />
        </div>

        <div className="mb-6 inline-flex items-center gap-2 rounded-full border border-primary/30 bg-primary/10 px-3 py-1 text-sm font-semibold text-primary">
          <OfficialCrest size={22} />
          {commonT("commissioning")}
        </div>

        <div className="mx-auto mb-5 flex h-16 w-16 items-center justify-center rounded-lg bg-primary/10 text-primary ring-1 ring-primary/20">
          {mailFailed ? <MailWarning className="h-8 w-8" /> : <ShieldCheck className="h-8 w-8" />}
        </div>

        <h1 className="text-2xl sm:text-3xl font-black tracking-tight text-foreground leading-snug">
          {t("pending_title")}
        </h1>
        <p className="mt-4 text-sm sm:text-base font-medium leading-relaxed text-muted-foreground">
          {t("pending_body")}
        </p>
        <p
          className={`mt-3 text-sm leading-relaxed ${
            mailFailed
              ? "rounded-lg border border-warning/40 bg-warning/10 px-3 py-3 text-warning"
              : "text-foreground/80"
          }`}
        >
          {mailFailed ? t("pending_mail_failed") : t("pending_mail")}
        </p>

        <div className="mt-8 flex flex-col sm:flex-row gap-3">
          <Link
            href="/"
            className="flex-1 inline-flex items-center justify-center rounded-xl border border-border bg-background py-3 font-bold text-foreground hover:bg-muted transition"
          >
            {t("back_home")}
          </Link>
          <Link
            href="/auth/login"
            className="flex-1 inline-flex items-center justify-center rounded-xl bg-primary py-3 font-bold text-primary-foreground hover:bg-primary/90 transition"
          >
            {t("sign_in")}
          </Link>
        </div>
      </article>
    </div>
  );
}
