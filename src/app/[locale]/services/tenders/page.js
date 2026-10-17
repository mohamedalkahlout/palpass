import { getPublicTenders } from "@/app/actions";
import {
  governmentServiceMetadata,
  governmentServiceJsonLd,
} from "@/lib/seo/government-metadata";
import { TendersClient } from "./TendersClient";
import { ServiceFrame } from "@/components/ui/ServiceFrame";

export async function generateMetadata({ params }) {
  const { locale } = await params;
  return governmentServiceMetadata({
    locale,
    path: "/services/tenders",
    titleAr: "عطاءات الشراء العام | PALPASS",
    titleEn: "Public Tenders | PALPASS",
    descAr: "كراسات العطاءات الحكومية وسداد رسم الكراسة من المحفظة.",
    descEn: "Government bid brochures paid from the digital wallet.",
  });
}

export default async function TendersPage({ params }) {
  const { locale } = await params;
  const result = await getPublicTenders();
  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{
          __html: JSON.stringify(
            governmentServiceJsonLd({
              locale,
              path: "/services/tenders",
              nameAr: "عطاءات الشراء العام",
              nameEn: "Public tenders",
              descriptionAr: "عطاءات مجلس الوزراء وكراسات الشروط.",
              descriptionEn: "Cabinet tenders and bid brochures.",
            })
          ),
        }}
      />
      <ServiceFrame service="tenders">
        <TendersClient tenders={result.tenders || []} purchases={result.purchases || []} />
      </ServiceFrame>
    </>
  );
}
