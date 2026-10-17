import { getTaxClearances } from "@/app/actions";
import {
  governmentServiceMetadata,
  governmentServiceJsonLd,
} from "@/lib/seo/government-metadata";
import { TaxClearanceClient } from "./TaxClearanceClient";
import { ServiceFrame } from "@/components/ui/ServiceFrame";

export async function generateMetadata({ params }) {
  const { locale } = await params;
  return governmentServiceMetadata({
    locale,
    path: "/services/tax-clearance",
    titleAr: "براءة الذمة | PALPASS",
    titleEn: "Tax Clearance | PALPASS",
    descAr: "شهادة خلو الطرف من ضرائب الدخل والقيمة المضافة والأملاك.",
    descEn: "Clearance for income tax, VAT, and property tax.",
  });
}

export default async function TaxClearancePage({ params }) {
  const { locale } = await params;
  const result = await getTaxClearances();
  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{
          __html: JSON.stringify(
            governmentServiceJsonLd({
              locale,
              path: "/services/tax-clearance",
              nameAr: "براءة الذمة",
              nameEn: "Tax clearance",
              descriptionAr: "شهادة مالية رقمية صالحة لتسعين يوماً.",
              descriptionEn: "A digital tax clearance valid for ninety days.",
            })
          ),
        }}
      />
      <ServiceFrame service="tax-clearance">
        <TaxClearanceClient certificates={result.certificates || []} />
      </ServiceFrame>
    </>
  );
}
