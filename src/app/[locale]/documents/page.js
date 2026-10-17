import {
  getUserCivicDocuments,
} from "@/app/actions";
import {
  governmentServiceMetadata,
  governmentServiceJsonLd,
} from "@/lib/seo/government-metadata";
import { DocumentsClient } from "./DocumentsClient";

export async function generateMetadata({ params }) {
  const { locale } = await params;
  return governmentServiceMetadata({
    locale,
    path: "/documents",
    titleAr: "الوثائق المدنية | PALPASS",
    titleEn: "Civic Documents | PALPASS",
    descAr: "عرض رخصة القيادة وتسجيل المركبة والتأمين الصحي الصادرة عن دولة فلسطين.",
    descEn: "View driving licence, vehicle registration, and health insurance documents issued by the State of Palestine.",
  });
}

export default async function DocumentsPage({ params }) {
  const { locale } = await params;
  const docs = await getUserCivicDocuments();

  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{
          __html: JSON.stringify(
            governmentServiceJsonLd({
              locale,
              path: "/documents",
              nameAr: "محفظة الوثائق المدنية",
              nameEn: "Civic documents wallet",
              descriptionAr: "الوثائق الرسمية الرقمية المرتبطة برقم الهوية الوطنية.",
              descriptionEn: "Official digital documents linked to the National ID.",
            })
          ),
        }}
      />
      <DocumentsClient
        initialDocuments={docs.documents || []}
        gateError={docs.success ? null : docs.error}
      />
    </>
  );
}
