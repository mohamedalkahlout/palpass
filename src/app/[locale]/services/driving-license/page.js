import { getDrivingLicenseAndVehicles } from "@/app/actions";
import {
  governmentServiceMetadata,
  governmentServiceJsonLd,
} from "@/lib/seo/government-metadata";
import { DrivingLicenseClient } from "./DrivingLicenseClient";
import { ServiceFrame } from "@/components/ui/ServiceFrame";

export async function generateMetadata({ params }) {
  const { locale } = await params;
  return governmentServiceMetadata({
    locale,
    path: "/services/driving-license",
    titleAr: "رخصة القيادة الذكية | PALPASS",
    titleEn: "Smart Driving Licence | PALPASS",
    descAr: "رخصة وزارة النقل وتسجيل المركبات.",
    descEn: "Ministry of Transport licence and vehicle registration.",
  });
}

export default async function DrivingLicensePage({ params }) {
  const { locale } = await params;
  const result = await getDrivingLicenseAndVehicles();
  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{
          __html: JSON.stringify(
            governmentServiceJsonLd({
              locale,
              path: "/services/driving-license",
              nameAr: "رخصة القيادة الذكية",
              nameEn: "Smart driving licence",
              descriptionAr: "رخصة القيادة وتسجيل المركبات لدى وزارة النقل.",
              descriptionEn: "Driving licence and vehicle registration.",
            })
          ),
        }}
      />
      <ServiceFrame service="driving-license">
        <DrivingLicenseClient license={result.license || null} vehicles={result.vehicles || []} signedIn={result.success} />
      </ServiceFrame>
    </>
  );
}
