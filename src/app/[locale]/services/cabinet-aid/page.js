import { getCabinetHumanitarianCases } from "@/app/actions";
import {
  governmentServiceMetadata,
  governmentServiceJsonLd,
} from "@/lib/seo/government-metadata";
import { CabinetAidClient } from "./CabinetAidClient";
import { ServiceFrame } from "@/components/ui/ServiceFrame";

export async function generateMetadata({ params }) {
  const { locale } = await params;
  return governmentServiceMetadata({
    locale,
    path: "/services/cabinet-aid",
    titleAr: "المساعدات الإنسانية | PALPASS",
    titleEn: "Humanitarian Relief | PALPASS",
    descAr: "تخصيصات إنسانية عاجلة بتفويض رئاسة الوزراء.",
    descEn: "Urgent humanitarian allocations under the Prime Minister.",
  });
}

export default async function CabinetAidPage({ params }) {
  const { locale } = await params;
  const result = await getCabinetHumanitarianCases();
  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{
          __html: JSON.stringify(
            governmentServiceJsonLd({
              locale,
              path: "/services/cabinet-aid",
              nameAr: "المساعدات الإنسانية",
              nameEn: "Humanitarian relief",
              descriptionAr: "طلبات التدخل العاجل لدى رئاسة الوزراء.",
              descriptionEn: "Urgent intervention requests at the Prime Minister's Office.",
            })
          ),
        }}
      />
      <ServiceFrame service="cabinet-aid">
        <CabinetAidClient cases={result.cases || []} />
      </ServiceFrame>
    </>
  );
}
