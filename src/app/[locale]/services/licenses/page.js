import { getUserTradeLicenses } from "@/app/actions";
import {
  governmentServiceMetadata,
  governmentServiceJsonLd,
} from "@/lib/seo/government-metadata";
import { LicensesClient } from "./LicensesClient";
import { ServiceFrame } from "@/components/ui/ServiceFrame";

export async function generateMetadata({ params }) {
  const { locale } = await params;
  return governmentServiceMetadata({
    locale,
    path: "/services/licenses",
    titleAr: "رخص المهن | PALPASS",
    titleEn: "Trade Licences | PALPASS",
    descAr: "عرض رخص التجارة وتواريخ الانتهاء وحالة الامتثال للتفتيش.",
    descEn: "View commercial trade licences, expiry dates, and inspection compliance status.",
  });
}

export default async function LicensesPage({ params }) {
  const { locale } = await params;
  const result = await getUserTradeLicenses();

  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{
          __html: JSON.stringify(
            governmentServiceJsonLd({
              locale,
              path: "/services/licenses",
              nameAr: "رخص المهن",
              nameEn: "Trade licences",
              descriptionAr: "رخص التجارة وحالة التفتيش البلدي.",
              descriptionEn: "Commercial trade licences and municipal inspection status.",
            })
          ),
        }}
      />
      <ServiceFrame service="licenses">
        <LicensesClient
          initialLicenses={result.licenses || []}
          gateError={result.success ? null : result.error}
        />
      </ServiceFrame>
    </>
  );
}
