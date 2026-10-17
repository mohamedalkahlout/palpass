import { getUserJusticeBundle } from "@/app/actions";
import {
  governmentServiceMetadata,
  governmentServiceJsonLd,
} from "@/lib/seo/government-metadata";
import { JusticeClient } from "./JusticeClient";
import { ServiceFrame } from "@/components/ui/ServiceFrame";

export async function generateMetadata({ params }) {
  const { locale } = await params;
  return governmentServiceMetadata({
    locale,
    path: "/services/justice",
    titleAr: "خدمات العدل | PALPASS",
    titleEn: "Justice Services | PALPASS",
    descAr: "وكالة رقمية وشهادات عدم محكومية لدولة فلسطين.",
    descEn: "Digital power of attorney and criminal clearance certificates for the State of Palestine.",
  });
}

export default async function JusticePage({ params }) {
  const { locale } = await params;
  const result = await getUserJusticeBundle();

  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{
          __html: JSON.stringify(
            governmentServiceJsonLd({
              locale,
              path: "/services/justice",
              nameAr: "خدمات وزارة العدل",
              nameEn: "Ministry of Justice services",
              descriptionAr: "إصدار وكالات وطلب شهادات عدم محكومية.",
              descriptionEn: "Issue powers of attorney and request criminal clearance certificates.",
            })
          ),
        }}
      />
      <ServiceFrame service="justice">
        <JusticeClient
          initialPoas={result.poas || []}
          initialCerts={result.certificates || []}
          gateError={result.success ? null : result.error}
        />
      </ServiceFrame>
    </>
  );
}
