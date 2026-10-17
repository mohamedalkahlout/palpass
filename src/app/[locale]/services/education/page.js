import { getMinisterialEducation } from "@/app/actions";
import {
  governmentServiceMetadata,
  governmentServiceJsonLd,
} from "@/lib/seo/government-metadata";
import { EducationClient } from "./EducationClient";
import { ServiceFrame } from "@/components/ui/ServiceFrame";

export async function generateMetadata({ params }) {
  const { locale } = await params;
  return governmentServiceMetadata({
    locale,
    path: "/services/education",
    titleAr: "التربية والتعليم العالي | PALPASS",
    titleEn: "Education and Higher Education | PALPASS",
    descAr: "كشف التوجيهي المعتمد وتصديق الشهادات الجامعية.",
    descEn: "Certified Tawjihi transcript and university degree attestation.",
  });
}

export default async function EducationPage({ params }) {
  const { locale } = await params;
  let records = [];
  try {
    const result = await getMinisterialEducation();
    records = result?.records || [];
  } catch (err) {
    console.error("[Handled SSR Exception - Education]:", err?.message);
    records = [];
  }

  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{
          __html: JSON.stringify(
            governmentServiceJsonLd({
              locale,
              path: "/services/education",
              nameAr: "بوابة التربية والتعليم العالي",
              nameEn: "Education and higher education",
              descriptionAr: "كشف التوجيهي والشهادات الجامعية المصدّقة.",
              descriptionEn: "Certified Tawjihi and university records.",
            })
          ),
        }}
      />
      <ServiceFrame service="education">
        <EducationClient records={records} />
      </ServiceFrame>
    </>
  );
}
