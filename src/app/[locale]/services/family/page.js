import { getFamilyBookData } from "@/app/actions";
import {
  governmentServiceMetadata,
  governmentServiceJsonLd,
} from "@/lib/seo/government-metadata";
import { FamilyClient } from "./FamilyClient";
import { ServiceFrame } from "@/components/ui/ServiceFrame";

export async function generateMetadata({ params }) {
  const { locale } = await params;
  return governmentServiceMetadata({
    locale,
    path: "/services/family",
    titleAr: "دفتر العائلة | PALPASS",
    titleEn: "Family Registry | PALPASS",
    descAr: "دفتر العائلة الرقمي لدى وزارة الداخلية.",
    descEn: "The digital family book of the Ministry of Interior.",
  });
}

export default async function FamilyPage({ params }) {
  const { locale } = await params;
  const result = await getFamilyBookData();
  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{
          __html: JSON.stringify(
            governmentServiceJsonLd({
              locale,
              path: "/services/family",
              nameAr: "دفتر العائلة الرقمي",
              nameEn: "Digital family book",
              descriptionAr: "أفراد الأسرة المسجّلون لدى الأحوال المدنية.",
              descriptionEn: "Household members registered with the civil registry.",
            })
          ),
        }}
      />
      <ServiceFrame service="family">
        <FamilyClient members={result.members || []} />
      </ServiceFrame>
    </>
  );
}
