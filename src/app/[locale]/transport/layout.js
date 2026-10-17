import {
  governmentServiceMetadata,
  governmentServiceJsonLd,
} from "@/lib/seo/government-metadata";

export async function generateMetadata({ params }) {
  const { locale } = await params;
  return governmentServiceMetadata({
    locale,
    path: "/transport",
    titleAr: "PALPASS | المواصلات المعتمدة",
    titleEn: "PALPASS | Accredited Transport",
    descAr: "الحافلات ومكاتب النقل المعتمدة ضمن المنظومة الوطنية.",
    descEn: "Accredited buses and transport offices on the national platform.",
  });
}

export default async function TransportLayout({ children, params }) {
  const { locale } = await params;
  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{
          __html: JSON.stringify(
            governmentServiceJsonLd({
              locale,
              path: "/transport",
              nameAr: "المواصلات المعتمدة",
              nameEn: "Accredited transport",
              descriptionAr: "شبكة النقل العام المعتمدة في دولة فلسطين.",
              descriptionEn: "The accredited public transport network of the State of Palestine.",
            })
          ),
        }}
      />
      {children}
    </>
  );
}
