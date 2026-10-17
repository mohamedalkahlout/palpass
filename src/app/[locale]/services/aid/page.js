import { AidClient } from "./AidClient";
import { ServiceFrame } from "@/components/ui/ServiceFrame";
import {
  governmentServiceMetadata,
  governmentServiceJsonLd,
} from "@/lib/seo/government-metadata";

export async function generateMetadata({ params }) {
  const { locale } = await params;
  return governmentServiceMetadata({
    locale,
    path: "/services/aid",
    titleAr: "PALPASS | حزم المساعدات",
    titleEn: "PALPASS | Aid Packages",
    descAr: "عرض الحزم الاجتماعية المفتوحة وتتبّع الاستلام عبر الهوية الرقمية.",
    descEn: "Browse open social aid packages and track claims through the digital identity.",
  });
}

export default async function AidPage({ params }) {
  const { locale } = await params;
  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{
          __html: JSON.stringify(
            governmentServiceJsonLd({
              locale,
              path: "/services/aid",
              nameAr: "حزم المساعدات",
              nameEn: "Aid packages",
              descriptionAr: "حزم إغاثية مفتوحة واستلام مؤهل عبر المنصة الوطنية.",
              descriptionEn: "Open relief packages and accredited claims through the national platform.",
            })
          ),
        }}
      />
      <ServiceFrame service="aid">
        <AidClient />
      </ServiceFrame>
    </>
  );
}
