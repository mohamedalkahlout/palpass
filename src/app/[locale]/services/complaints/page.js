import { getCabinetComplaints } from "@/app/actions";
import {
  governmentServiceMetadata,
  governmentServiceJsonLd,
} from "@/lib/seo/government-metadata";
import { ComplaintsClient } from "./ComplaintsClient";
import { ServiceFrame } from "@/components/ui/ServiceFrame";

export async function generateMetadata({ params }) {
  const { locale } = await params;
  return governmentServiceMetadata({
    locale,
    path: "/services/complaints",
    titleAr: "شكاوى مجلس الوزراء | PALPASS",
    titleEn: "Cabinet Complaints | PALPASS",
    descAr: "تظلّم موجّه للوزارة المختصة مع مهلة 14 يوماً.",
    descEn: "A grievance to the competent ministry with a 14-day deadline.",
  });
}

export default async function ComplaintsPage({ params }) {
  const { locale } = await params;
  const result = await getCabinetComplaints();
  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{
          __html: JSON.stringify(
            governmentServiceJsonLd({
              locale,
              path: "/services/complaints",
              nameAr: "شكاوى مجلس الوزراء",
              nameEn: "Cabinet complaints",
              descriptionAr: "متابعة التظلمات لدى الأمانة العامة لمجلس الوزراء.",
              descriptionEn: "Track grievances with the Cabinet Secretariat.",
            })
          ),
        }}
      />
      <ServiceFrame service="complaints">
        <ComplaintsClient complaints={result.complaints || []} />
      </ServiceFrame>
    </>
  );
}
