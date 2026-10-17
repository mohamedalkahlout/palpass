import { getCitizenCv } from "@/app/actions";
import { CvBuilderClient } from "./CvBuilderClient";

export async function generateMetadata({ params }) {
  const { locale } = await params;
  const isAr = locale === "ar";
  return {
    title: isAr ? "السيرة الذاتية المعتمدة | PALPASS" : "Accredited ATS resume | PALPASS",
    description: isAr
      ? "سيرة ذاتية إنجليزية بصيغة مهنية أو أكاديمية متوافقة مع أنظمة فرز الطلبات."
      : "English professional or academic resume formatted for applicant tracking systems.",
  };
}

export default async function CitizenCvPage() {
  const result = await getCitizenCv();
  return (
    <CvBuilderClient initialCv={result.cv} signaturePreview={result.signaturePreview} />
  );
}
