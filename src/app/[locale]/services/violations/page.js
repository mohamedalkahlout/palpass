import { ViolationsClient } from "./ViolationsClient";
import { ServiceFrame } from "@/components/ui/ServiceFrame";
import {
  governmentServiceMetadata,
  governmentServiceJsonLd,
} from "@/lib/seo/government-metadata";

export async function generateMetadata({ params }) {
  const { locale } = await params;
  return governmentServiceMetadata({
    locale,
    path: "/services/violations",
    titleAr: "PALPASS | المخالفات المرورية ورسوم السير",
    titleEn: "PALPASS | Traffic Violations and Road Fees",
    descAr: "عرض وتسوية المخالفات المرورية من المحفظة الرقمية الوطنية.",
    descEn: "View and settle traffic violations from the national digital wallet.",
  });
}

export default async function ViolationsPage({ params }) {
  const { locale } = await params;
  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{
          __html: JSON.stringify(
            governmentServiceJsonLd({
              locale,
              path: "/services/violations",
              nameAr: "المخالفات المرورية ورسوم السير",
              nameEn: "Traffic violations and road fees",
              descriptionAr: "تسوية المخالفات المرورية عبر الهوية الرقمية.",
              descriptionEn: "Settle traffic violations through the digital identity.",
            })
          ),
        }}
      />
      <ServiceFrame service="violations">
        <ViolationsClient />
      </ServiceFrame>
    </>
  );
}
