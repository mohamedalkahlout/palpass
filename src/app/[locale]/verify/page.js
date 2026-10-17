import {
  governmentServiceMetadata,
  governmentServiceJsonLd,
} from "@/lib/seo/government-metadata";
import { TatreezDivider } from "@/components/ui/TatreezDivider";
import { VerifyPortal } from "./VerifyPortal";

export async function generateMetadata({ params }) {
  const { locale } = await params;
  return governmentServiceMetadata({
    locale,
    path: "/verify",
    titleAr: "التحقق من الوثائق الرسمية | PALPASS",
    titleEn: "Official Document Verification | PALPASS",
    descAr: "بوابة التحقق الوطني من الوثائق الصادرة عن دولة فلسطين برقم الهوية أو رمز التحقق.",
    descEn: "National verification gateway for documents issued by the State of Palestine, by National ID or verification token.",
  });
}

export default async function VerifyPage({ params, searchParams }) {
  const { locale } = await params;
  const sp = await searchParams;
  const nationalId = String(sp?.national_id || "").trim();
  const token = String(sp?.token || "").trim();
  const isAr = locale === "ar";

  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{
          __html: JSON.stringify(
            governmentServiceJsonLd({
              locale,
              path: "/verify",
              nameAr: "بوابة التحقق من الوثائق الرسمية",
              nameEn: "Official document verification gateway",
              descriptionAr: "التحقق الرسمي من الوثائق والهويات الصادرة عن دولة فلسطين.",
              descriptionEn: "Official verification of documents and identities issued by the State of Palestine.",
            })
          ),
        }}
      />
      <article className="page-wrap grid gap-6 py-8">
        <header className="border-b border-border pb-4">
          <p className="text-xs font-semibold tracking-wide text-[color:var(--brand-900)]">
            {isAr ? "دولة فلسطين — السجل الرسمي للتحقق" : "State of Palestine — Official Verification Registry"}
          </p>
          <h1 className="mt-1 text-2xl font-bold text-foreground">
            {isAr ? "التحقق من الوثائق الرسمية" : "Official document verification"}
          </h1>
          <TatreezDivider className="justify-start" />
        </header>
        <VerifyPortal
          locale={locale}
          initialNationalId={nationalId}
          initialToken={token}
        />
      </article>
    </>
  );
}
