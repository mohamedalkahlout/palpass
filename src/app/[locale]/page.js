import { getGazetteEditions } from "@/app/actions";
import { CitizenHome } from "@/components/home/CitizenHome";
import { HeroSection } from "@/components/sections/HeroSection";
import { governmentOrganizationJsonLd } from "@/lib/seo/government-metadata";

export async function generateMetadata({ params }) {
  const { locale } = await params;
  const isAr = locale === "ar";
  return {
    title: isAr
      ? "بوابة دولة فلسطين الرقمية الموحدة — الأمانة العامة لمجلس الوزراء"
      : "Unified digital gateway of the State of Palestine — Cabinet Secretariat",
  };
}

export default async function Home({ params }) {
  const { locale } = await params;
  let editions = [];
  try {
    const gazette = await getGazetteEditions();
    editions = gazette?.editions || [];
  } catch (err) {
    console.error("[Handled SSR Exception - Home Gazette]:", err?.message);
    editions = [];
  }

  const jsonLd = governmentOrganizationJsonLd({ locale });
  return (
    <>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }} />
      <HeroSection locale={locale} />
      <CitizenHome editions={editions} />
    </>
  );
}
