import { GovernmentClient } from "./GovernmentClient";
import { ServiceFrame } from "@/components/ui/ServiceFrame";
import {
  governmentServiceMetadata,
  governmentServiceJsonLd,
} from "@/lib/seo/government-metadata";

export async function generateMetadata({ params }) {
  const { locale } = await params;
  return governmentServiceMetadata({
    locale,
    path: "/services/government",
    titleAr: "PALPASS | الخدمات الحكومية",
    titleEn: "PALPASS | Government Services",
    descAr: "تجديد جواز السفر، تحقّق الهوية، وقيد الملكية عبر البوابة الوطنية.",
    descEn: "Renew passports, validate identity, and register land documents through the national gateway.",
  });
}

export default async function GovernmentPage({ params }) {
  const { locale } = await params;
  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{
          __html: JSON.stringify(
            governmentServiceJsonLd({
              locale,
              path: "/services/government",
              nameAr: "الخدمات الحكومية",
              nameEn: "Government services",
              descriptionAr: "خدمات جواز السفر والتحقّق من الهوية وسجل العقار.",
              descriptionEn: "Passport, identity validation, and land registry services.",
            })
          ),
        }}
      />
      <ServiceFrame service="government">
        <GovernmentClient />
      </ServiceFrame>
    </>
  );
}
