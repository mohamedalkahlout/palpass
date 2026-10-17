import { getHospitalDirectory } from "@/app/actions";
import {
  governmentServiceMetadata,
  governmentServiceJsonLd,
} from "@/lib/seo/government-metadata";
import { HospitalsClient } from "./HospitalsClient";
import { ServiceFrame } from "@/components/ui/ServiceFrame";

export async function generateMetadata({ params }) {
  const { locale } = await params;
  return governmentServiceMetadata({
    locale,
    path: "/services/hospitals",
    titleAr: "شبكة المستشفيات الوطنية | PALPASS",
    titleEn: "National Hospital Network | PALPASS",
    descAr: "مستشفيات وزارة الصحة والمستشفيات الخيرية وحجز العيادات.",
    descEn: "Ministry of Health and charitable hospitals with clinic booking.",
  });
}

export default async function HospitalsPage({ params, searchParams }) {
  const { locale } = await params;
  const query = await searchParams;
  const governorate = String(query?.governorate || "all");
  const sector = String(query?.sector || "all");
  const result = await getHospitalDirectory(governorate, sector);
  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{
          __html: JSON.stringify(
            governmentServiceJsonLd({
              locale,
              path: "/services/hospitals",
              nameAr: "شبكة المستشفيات الوطنية",
              nameEn: "National hospital network",
              descriptionAr: "دليل مستشفيات وزارة الصحة والطوارئ.",
              descriptionEn: "Ministry of Health hospital directory and emergency status.",
            })
          ),
        }}
      />
      <ServiceFrame service="hospitals">
        <HospitalsClient hospitals={result.hospitals || []} governorate={governorate} sector={sector} />
      </ServiceFrame>
    </>
  );
}
