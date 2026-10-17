import { getUserAidRationCard } from "@/app/actions";
import {
  governmentServiceMetadata,
  governmentServiceJsonLd,
} from "@/lib/seo/government-metadata";
import { AidRationClient } from "./AidRationClient";
import { ServiceFrame } from "@/components/ui/ServiceFrame";

export async function generateMetadata({ params }) {
  const { locale } = await params;
  return governmentServiceMetadata({
    locale,
    path: "/services/aid-ration",
    titleAr: "بطاقة التموين | PALPASS",
    titleEn: "Aid Ration Card | PALPASS",
    descAr: "عرض بطاقة التموين الرقمية ودورة التوزيع ورمز التحقق.",
    descEn: "View your digital ration card, distribution cycle, and verification QR hash.",
  });
}

export default async function AidRationPage({ params }) {
  const { locale } = await params;
  const result = await getUserAidRationCard();

  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{
          __html: JSON.stringify(
            governmentServiceJsonLd({
              locale,
              path: "/services/aid-ration",
              nameAr: "بطاقة التموين الرقمية",
              nameEn: "Digital ration card",
              descriptionAr: "تصريح التموين المعتمد للأسرة لدورة التوزيع الحالية.",
              descriptionEn: "Accredited household ration pass for the current distribution cycle.",
            })
          ),
        }}
      />
      <ServiceFrame service="aid-ration">
        <AidRationClient
          initialCard={result.card || null}
          gateError={result.success ? null : result.error}
        />
      </ServiceFrame>
    </>
  );
}
