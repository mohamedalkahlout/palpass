import { getCharityCampaigns } from "@/app/actions";
import {
  governmentServiceMetadata,
  governmentServiceJsonLd,
} from "@/lib/seo/government-metadata";
import { CharityClient } from "./CharityClient";

export async function generateMetadata({ params }) {
  const { locale } = await params;
  return governmentServiceMetadata({
    locale,
    path: "/charity",
    titleAr: "العمل الخيري الوطني | PALPASS",
    titleEn: "National Charity | PALPASS",
    descAr: "المساهمة في حملات الخير الوطنية المعتمدة عبر المحفظة الموحدة بالشيكل.",
    descEn: "Contribute to accredited national charity campaigns via the unified ILS wallet.",
  });
}

export default async function CharityPage({ params }) {
  const { locale } = await params;
  const result = await getCharityCampaigns();

  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{
          __html: JSON.stringify(
            governmentServiceJsonLd({
              locale,
              path: "/charity",
              nameAr: "العمل الخيري الوطني",
              nameEn: "National Charitable Work",
              descriptionAr: "المساهمة في المبادرات المعتمدة عبر المحفظة الرقمية الوطنية.",
              descriptionEn: "Contribute to accredited initiatives through the national digital wallet.",
            })
          ),
        }}
      />
      <CharityClient
        initialCampaigns={result.campaigns || []}
        fetchError={result.success ? null : result.error}
      />
    </>
  );
}
