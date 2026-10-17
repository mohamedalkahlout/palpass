import { getGazetteEditions } from "@/app/actions";
import {
  governmentServiceMetadata,
  governmentServiceJsonLd,
} from "@/lib/seo/government-metadata";
import { GazetteClient } from "./GazetteClient";
import { ServiceFrame } from "@/components/ui/ServiceFrame";

export async function generateMetadata({ params }) {
  const { locale } = await params;
  return governmentServiceMetadata({
    locale,
    path: "/services/gazette",
    titleAr: "الوقائع الفلسطينية | PALPASS",
    titleEn: "Official Gazette | PALPASS",
    descAr: "الجريدة الرسمية لديوان الفتوى والتشريع.",
    descEn: "The official gazette of Diwan al-Fatwa and Legislation.",
  });
}

export default async function GazettePage({ params, searchParams }) {
  const { locale } = await params;
  const query = await searchParams;
  let result = { editions: [] };
  try {
    result = await getGazetteEditions(query?.q, query?.type);
  } catch (err) {
    console.error("[Handled SSR Exception - Gazette]:", err?.message);
    result = { editions: [] };
  }

  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{
          __html: JSON.stringify(
            governmentServiceJsonLd({
              locale,
              path: "/services/gazette",
              nameAr: "الوقائع الفلسطينية",
              nameEn: "Official gazette",
              descriptionAr: "أعداد الجريدة الرسمية والقرارات المنشورة.",
              descriptionEn: "Official gazette editions and published decrees.",
            })
          ),
        }}
      />
      <ServiceFrame service="gazette">
        <GazetteClient editions={result?.editions || []} query={String(query?.q || "")} type={String(query?.type || "all")} />
      </ServiceFrame>
    </>
  );
}
