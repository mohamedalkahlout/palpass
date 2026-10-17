import { getJerusalemSupportCases } from "@/app/actions";
import {
  governmentServiceMetadata,
  governmentServiceJsonLd,
} from "@/lib/seo/government-metadata";
import { JerusalemFundClient } from "./JerusalemFundClient";
import { ServiceFrame } from "@/components/ui/ServiceFrame";

export async function generateMetadata({ params }) {
  const { locale } = await params;
  return governmentServiceMetadata({
    locale,
    path: "/services/jerusalem-fund",
    titleAr: "صمود القدس | PALPASS",
    titleEn: "Jerusalem Resilience | PALPASS",
    descAr: "إسناد قانوني واقتصادي للمقدسيين من وحدة دعم القدس.",
    descEn: "Legal and economic support for Jerusalemites.",
  });
}

export default async function JerusalemFundPage({ params }) {
  const { locale } = await params;
  const result = await getJerusalemSupportCases();
  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{
          __html: JSON.stringify(
            governmentServiceJsonLd({
              locale,
              path: "/services/jerusalem-fund",
              nameAr: "صمود القدس",
              nameEn: "Jerusalem resilience",
              descriptionAr: "ملفات الإسناد القانوني والاقتصادي في القدس.",
              descriptionEn: "Legal and economic resilience files in Jerusalem.",
            })
          ),
        }}
      />
      <ServiceFrame service="jerusalem-fund">
        <JerusalemFundClient cases={result.cases || []} />
      </ServiceFrame>
    </>
  );
}
