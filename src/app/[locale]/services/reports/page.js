import { getUserCivicReports } from "@/app/actions";
import {
  governmentServiceMetadata,
  governmentServiceJsonLd,
} from "@/lib/seo/government-metadata";
import { ReportsClient } from "./ReportsClient";
import { ServiceFrame } from "@/components/ui/ServiceFrame";

export async function generateMetadata({ params }) {
  const { locale } = await params;
  return governmentServiceMetadata({
    locale,
    path: "/services/reports",
    titleAr: "البلاغات المدنية | PALPASS",
    titleEn: "Civic Reports | PALPASS",
    descAr: "تقديم وتتبع بلاغات المياه والكهرباء والطرق والصرف الصحي.",
    descEn: "Submit and track civic incident reports for water, electricity, roads, and sanitation.",
  });
}

export default async function ReportsPage({ params }) {
  const { locale } = await params;
  const result = await getUserCivicReports();

  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{
          __html: JSON.stringify(
            governmentServiceJsonLd({
              locale,
              path: "/services/reports",
              nameAr: "البلاغات المدنية",
              nameEn: "Civic incident reports",
              descriptionAr: "بلّغ عن مشكلات البنية التحتية والخدمات البلدية.",
              descriptionEn: "Report municipal and infrastructure issues to the competent authorities.",
            })
          ),
        }}
      />
      <ServiceFrame service="reports">
        <ReportsClient
          initialReports={result.reports || []}
          gateError={result.success ? null : result.error}
        />
      </ServiceFrame>
    </>
  );
}
