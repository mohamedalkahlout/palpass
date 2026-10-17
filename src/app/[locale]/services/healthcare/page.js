import { getCurrentUser } from "@/lib/supabase/server";
import { getHealthInsurance, getMedicalRecords } from "@/lib/supabase/service";
import { HealthcareClient } from "./HealthcareClient";
import { ServiceFrame } from "@/components/ui/ServiceFrame";
import {
  governmentServiceMetadata,
  governmentServiceJsonLd,
} from "@/lib/seo/government-metadata";

export async function generateMetadata({ params }) {
  const { locale } = await params;
  return governmentServiceMetadata({
    locale,
    path: "/services/healthcare",
    titleAr: "PALPASS | التأمين الصحي والسجلات الطبية",
    titleEn: "PALPASS | Health Insurance and Medical Records",
    descAr: "عرض التأمين الطبي والسجلات الطبية الوطنية وحالة التغطية.",
    descEn: "View health insurance coverage and national medical records.",
  });
}

export default async function HealthcarePage({ params }) {
  const { locale } = await params;
  let user = null;
  try {
    user = await getCurrentUser();
  } catch (err) {
    console.error("[Handled SSR Exception - Healthcare User]:", err?.message);
    user = null;
  }

  let insurance = null;
  let records = [];
  if (user) {
    try {
      const [ins, rec] = await Promise.all([
        getHealthInsurance(user.id),
        getMedicalRecords(user.id),
      ]);
      insurance = ins || null;
      records = rec || [];
    } catch (err) {
      console.error("[Handled SSR Exception - Healthcare Data]:", err?.message);
      insurance = null;
      records = [];
    }
  }

  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{
          __html: JSON.stringify(
            governmentServiceJsonLd({
              locale,
              path: "/services/healthcare",
              nameAr: "التأمين الصحي والسجلات الطبية",
              nameEn: "Health insurance and medical records",
              descriptionAr: "بيانات التغطية الطبية والسجلات الطبية الوطنية.",
              descriptionEn: "National medical coverage and health record data.",
            })
          ),
        }}
      />
      <ServiceFrame service="healthcare">
        <HealthcareClient insurance={insurance} records={records || []} />
      </ServiceFrame>
    </>
  );
}
