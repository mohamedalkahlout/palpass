import { cache } from "react";
import { createClient, getCurrentUser } from "@/lib/supabase/server";
import {
  governmentServiceMetadata,
  governmentServiceJsonLd,
} from "@/lib/seo/government-metadata";
import { JobsClient } from "./JobsClient";

const getApprovedJobs = cache(async () => {
  try {
    const supabase = await createClient();
    const { data, error } = await supabase
      .from("job_postings")
      .select("*")
      .eq("status", "approved")
      .order("created_at", { ascending: false });
    if (error) return [];
    return data || [];
  } catch (err) {
    console.error("[Handled SSR Exception - getApprovedJobs]:", err?.message);
    return [];
  }
});

export async function generateMetadata({ params }) {
  const { locale } = await params;
  return governmentServiceMetadata({
    locale,
    path: "/jobs",
    titleAr: "PALPASS | بوابة التوظيف والفرص المهنية الوطنية",
    titleEn: "PALPASS | National Employment and Professional Opportunities",
    descAr: "استعراض الوظائف الحكومية والخاصة المعتمدة والتقدّم إليها عبر الهوية الرقمية الوطنية.",
    descEn: "Browse accredited public and private vacancies and apply with your national digital identity.",
  });
}

export default async function JobsPage({ params }) {
  const { locale } = await params;
  let user = null;
  try {
    user = await getCurrentUser();
  } catch (err) {
    console.error("[Handled SSR Exception - Jobs User]:", err?.message);
    user = null;
  }

  let profile = null;
  let appliedJobIds = [];
  let activeCv = null;
  if (user) {
    try {
      const supabase = await createClient();
      const [{ data: profileRow }, { data: applications }, { data: cvRow }] = await Promise.all([
        supabase
          .from("profiles")
          .select("id, full_name, national_id, status, is_verified")
          .eq("id", user.id)
          .maybeSingle(),
        supabase.from("job_applications").select("job_id").eq("user_id", user.id),
        supabase.from("citizen_cvs").select("template_type, personal_info, summary, work_experience, education, skills, certifications, academic_publications, languages, updated_at").eq("user_id", user.id).maybeSingle(),
      ]);
      profile = profileRow || null;
      appliedJobIds = (applications || []).map((row) => row.job_id);
      activeCv = cvRow || null;
    } catch (err) {
      console.error("[Handled SSR Exception - Jobs User Data]:", err?.message);
      profile = null;
      appliedJobIds = [];
      activeCv = null;
    }
  }

  let jobs = [];
  try {
    jobs = await getApprovedJobs();
  } catch (err) {
    console.error("[Handled SSR Exception - getApprovedJobs Call]:", err?.message);
    jobs = [];
  }

  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{
          __html: JSON.stringify(
            governmentServiceJsonLd({
              locale,
              path: "/jobs",
              nameAr: "بوابة التوظيف والفرص المهنية الوطنية",
              nameEn: "National Employment and Professional Opportunities",
              descriptionAr: "فرص العمل المعتمدة في القطاعين العام والخاص عبر منظومة PALPASS.",
              descriptionEn: "Accredited public and private vacancies on the PALPASS platform.",
            })
          ),
        }}
      />
      <JobsClient
        initialJobs={jobs}
        profile={profile}
        appliedJobIds={appliedJobIds}
        activeCv={activeCv}
        locale={locale}
      />
    </>
  );
}
