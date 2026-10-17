import { getUserAppointments } from "@/app/actions";
import {
  governmentServiceMetadata,
  governmentServiceJsonLd,
} from "@/lib/seo/government-metadata";
import { AppointmentsClient } from "./AppointmentsClient";

export async function generateMetadata({ params }) {
  const { locale } = await params;
  return governmentServiceMetadata({
    locale,
    path: "/appointments",
    titleAr: "المواعيد الحكومية | PALPASS",
    titleEn: "Government Appointments | PALPASS",
    descAr: "جدولة مواعيد مدنية لدى النقل والشؤون المدنية والصحة والعدل.",
    descEn: "Schedule civic appointments with Transport, Civil Affairs, Health, and Justice ministries.",
  });
}

export default async function AppointmentsPage({ params, searchParams }) {
  const { locale } = await params;
  const query = await searchParams;
  const initialMinistry = query?.category === "health" ? "health" : "";
  const result = await getUserAppointments();

  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{
          __html: JSON.stringify(
            governmentServiceJsonLd({
              locale,
              path: "/appointments",
              nameAr: "المواعيد الحكومية",
              nameEn: "Government appointments",
              descriptionAr: "حجز مواعيد رسمية في فروع الوزارات المعتمدة.",
              descriptionEn: "Book official appointments at accredited ministry branches.",
            })
          ),
        }}
      />
      <AppointmentsClient
        initialAppointments={result.appointments || []}
        initialMinistry={initialMinistry}
        gateError={result.success ? null : result.error}
      />
    </>
  );
}
