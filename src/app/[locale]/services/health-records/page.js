import { getUserHealthBundle } from "@/app/actions";
import {
  governmentServiceMetadata,
  governmentServiceJsonLd,
} from "@/lib/seo/government-metadata";
import { HealthRecordsClient } from "./HealthRecordsClient";
import { ServiceFrame } from "@/components/ui/ServiceFrame";

export async function generateMetadata({ params }) {
  const { locale } = await params;
  return governmentServiceMetadata({
    locale,
    path: "/services/health-records",
    titleAr: "السجلات الصحية | PALPASS",
    titleEn: "Health Records | PALPASS",
    descAr: "عرض وتحديث ملفك الطبي الوطني وسجلات التطعيم.",
    descEn: "View and update your national medical profile and vaccination records.",
  });
}

export default async function HealthRecordsPage({ params }) {
  const { locale } = await params;
  const result = await getUserHealthBundle();

  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{
          __html: JSON.stringify(
            governmentServiceJsonLd({
              locale,
              path: "/services/health-records",
              nameAr: "السجلات الصحية",
              nameEn: "Health records",
              descriptionAr: "الملف الطبي والحساسيات وسجل التطعيم.",
              descriptionEn: "Medical profile, allergies, and vaccination history.",
            })
          ),
        }}
      />
      <ServiceFrame service="health-records">
        <HealthRecordsClient
          initialProfile={result.profile || null}
          initialVaccines={result.vaccines || []}
          gateError={result.success ? null : result.error}
        />
      </ServiceFrame>
    </>
  );
}
