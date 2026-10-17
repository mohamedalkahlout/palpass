import { getUserHajjApplication } from "@/app/actions";
import {
  governmentServiceMetadata,
  governmentServiceJsonLd,
} from "@/lib/seo/government-metadata";
import { HajjClient } from "./HajjClient";
import { ServiceFrame } from "@/components/ui/ServiceFrame";

export async function generateMetadata({ params }) {
  const { locale } = await params;
  return governmentServiceMetadata({
    locale,
    path: "/services/hajj",
    titleAr: "تسجيل الحج | PALPASS",
    titleEn: "Hajj Registration | PALPASS",
    descAr: "التسجيل في قرعة الحج الوطنية مع بيانات المحرم والحالة الصحية.",
    descEn: "Register for the national Hajj lottery with mahram and health status details.",
  });
}

export default async function HajjPage({ params }) {
  const { locale } = await params;
  const result = await getUserHajjApplication();

  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{
          __html: JSON.stringify(
            governmentServiceJsonLd({
              locale,
              path: "/services/hajj",
              nameAr: "الحج والعمرة",
              nameEn: "Hajj and Umrah",
              descriptionAr: "التسجيل في موسم الحج عبر المنصة الوطنية.",
              descriptionEn: "Register for the Hajj season through the national platform.",
            })
          ),
        }}
      />
      <ServiceFrame service="hajj">
        <HajjClient
          initialApplication={result.application || null}
          gateError={result.success ? null : result.error}
        />
      </ServiceFrame>
    </>
  );
}
