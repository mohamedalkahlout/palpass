"use client";

import { useMemo, useState } from "react";
import { useTranslations } from "next-intl";
import { Button } from "@/components/ui/button";
import { AtsCvDocument } from "@/components/cv/AtsCvDocument";
import { SignaturePad } from "@/components/cv/SignaturePad";
import { saveCitizenCv } from "@/app/actions";
import { toast } from "sonner";
import { Loader2 } from "lucide-react";

const emptyJob = () => ({
  company: "",
  role: "",
  location: "",
  start_date: "",
  end_date: "",
  is_current: false,
  bullet_points: [""],
});

const emptyDegree = () => ({
  institution: "",
  degree: "",
  field_of_study: "",
  graduation_year: "",
  gpa_or_honors: "",
  thesis_title: "",
});

function field(setter, key) {
  return (event) => setter((current) => ({ ...current, [key]: event.target.value }));
}

export function CvBuilderClient({ initialCv = null, signaturePreview = null }) {
  const t = useTranslations("Cv");
  const info = initialCv?.personal_info || {};
  const [templateType, setTemplateType] = useState(initialCv?.template_type || "professional");
  const [personal, setPersonal] = useState({
    full_name_en: info.full_name_en || "",
    professional_title: info.professional_title || "",
    email: info.email || "",
    phone: info.phone || "",
    location: info.location || "",
    linkedin: info.linkedin || "",
    portfolio: info.portfolio || "",
    verification_hash: info.verification_hash || "",
  });
  const [summary, setSummary] = useState(initialCv?.summary || "");
  const [experience, setExperience] = useState(
    initialCv?.work_experience?.length ? initialCv.work_experience : [emptyJob()]
  );
  const [education, setEducation] = useState(
    initialCv?.education?.length ? initialCv.education : [emptyDegree()]
  );
  const [skillsText, setSkillsText] = useState((initialCv?.skills || []).join(", "));
  const [publications, setPublications] = useState(
    initialCv?.academic_publications?.length
      ? initialCv.academic_publications
      : [{ title: "", journal_conference: "", year: "", doi_or_link: "", authors: "" }]
  );
  const [languages, setLanguages] = useState(
    initialCv?.languages?.length ? initialCv.languages : [{ language: "Arabic", proficiency: "Native" }]
  );
  const [signatureDataUrl, setSignatureDataUrl] = useState("");
  const [signatureMode, setSignatureMode] = useState("draw");
  const [saving, setSaving] = useState(false);
  const [savedHash, setSavedHash] = useState(info.verification_hash || "");

  const preview = useMemo(
    () => ({
      template_type: templateType,
      summary,
      personal_info: { ...personal, verification_hash: savedHash || personal.verification_hash },
      work_experience: experience,
      education,
      skills: skillsText.split(",").map((item) => item.trim()).filter(Boolean),
      academic_publications: publications,
      languages,
    }),
    [education, experience, languages, personal, publications, savedHash, skillsText, summary, templateType]
  );

  const signatureSrc = signatureDataUrl || signaturePreview || "";

  const save = async () => {
    setSaving(true);
    const result = await saveCitizenCv({
      templateType,
      personalInfo: personal,
      summary,
      workExperience: experience.map((item) => ({
        ...item,
        bullet_points: (item.bullet_points || []).map((point) => point.trim()).filter(Boolean),
      })),
      education,
      skills: preview.skills,
      publications,
      languages,
      signatureUrl: initialCv?.signature_url || null,
      signatureDataUrl,
    });
    setSaving(false);
    if (!result.success) {
      toast.error(result.error || t("save_failed"));
      return;
    }
    setSavedHash(result.cv?.personal_info?.verification_hash || "");
    toast.success(t("saved"));
  };

  return (
    <div className="mx-auto grid max-w-6xl gap-8 px-4 py-12 lg:grid-cols-2">
      <div className="space-y-5">
        <div>
          <h1 className="text-3xl font-black text-foreground">{t("title")}</h1>
          <p className="mt-2 text-sm leading-relaxed text-muted-foreground">{t("subtitle")}</p>
        </div>
        <div className="flex gap-2">
          {["professional", "academic"].map((key) => (
            <button
              key={key}
              type="button"
              onClick={() => setTemplateType(key)}
              className={`rounded-full px-4 py-2 text-sm font-bold ${
                templateType === key ? "bg-primary text-primary-foreground" : "bg-muted text-foreground"
              }`}
            >
              {t(key)}
            </button>
          ))}
        </div>
        <div className="grid gap-3 sm:grid-cols-2">
          {[
            ["full_name_en", "name"],
            ["professional_title", "headline"],
            ["email", "email"],
            ["phone", "phone"],
            ["location", "location"],
            ["linkedin", "linkedin"],
          ].map(([key, label]) => (
            <label key={key} className="block text-sm font-semibold">
              {t(label)}
              <input
                value={personal[key]}
                onChange={field(setPersonal, key)}
                className="mt-1 w-full rounded-sm border border-border bg-card px-3 py-2 font-normal"
                dir="ltr"
              />
            </label>
          ))}
        </div>
        <label className="block text-sm font-semibold">
          {t("summary")}
          <textarea
            value={summary}
            onChange={(event) => setSummary(event.target.value)}
            rows={4}
            className="mt-1 w-full rounded-sm border border-border bg-card px-3 py-2 font-normal"
            dir="ltr"
          />
        </label>
        <label className="block text-sm font-semibold">
          {templateType === "academic" ? t("honors") : t("skills")}
          <input
            value={skillsText}
            onChange={(event) => setSkillsText(event.target.value)}
            className="mt-1 w-full rounded-sm border border-border bg-card px-3 py-2 font-normal"
            dir="ltr"
          />
        </label>

        <section className="space-y-3 rounded-lg border border-border p-4">
          <h2 className="font-bold">{t("experience")}</h2>
          {experience.map((job, index) => (
            <div key={index} className="grid gap-2 sm:grid-cols-2">
              <input placeholder={t("role")} value={job.role} onChange={(event) => setExperience((rows) => rows.map((row, i) => i === index ? { ...row, role: event.target.value } : row))} className="rounded-sm border border-border px-3 py-2" dir="ltr" />
              <input placeholder={t("company")} value={job.company} onChange={(event) => setExperience((rows) => rows.map((row, i) => i === index ? { ...row, company: event.target.value } : row))} className="rounded-sm border border-border px-3 py-2" dir="ltr" />
              <input placeholder="MM/YYYY" value={job.start_date} onChange={(event) => setExperience((rows) => rows.map((row, i) => i === index ? { ...row, start_date: event.target.value } : row))} className="rounded-sm border border-border px-3 py-2" dir="ltr" />
              <input placeholder="MM/YYYY" value={job.end_date} onChange={(event) => setExperience((rows) => rows.map((row, i) => i === index ? { ...row, end_date: event.target.value } : row))} className="rounded-sm border border-border px-3 py-2" dir="ltr" />
              <textarea
                placeholder={t("bullets")}
                value={(job.bullet_points || []).join("\n")}
                onChange={(event) => setExperience((rows) => rows.map((row, i) => i === index ? { ...row, bullet_points: event.target.value.split("\n") } : row))}
                rows={3}
                className="rounded-sm border border-border px-3 py-2 sm:col-span-2"
                dir="ltr"
              />
            </div>
          ))}
          <Button type="button" variant="outline" className="rounded-xl" onClick={() => setExperience((rows) => [...rows, emptyJob()])}>
            {t("add_role")}
          </Button>
        </section>

        <section className="space-y-3 rounded-lg border border-border p-4">
          <h2 className="font-bold">{t("education")}</h2>
          {education.map((item, index) => (
            <div key={index} className="grid gap-2 sm:grid-cols-2">
              <input placeholder={t("institution")} value={item.institution} onChange={(event) => setEducation((rows) => rows.map((row, i) => i === index ? { ...row, institution: event.target.value } : row))} className="rounded-sm border border-border px-3 py-2" dir="ltr" />
              <input placeholder={t("degree")} value={item.degree} onChange={(event) => setEducation((rows) => rows.map((row, i) => i === index ? { ...row, degree: event.target.value } : row))} className="rounded-sm border border-border px-3 py-2" dir="ltr" />
              <input placeholder={t("field")} value={item.field_of_study} onChange={(event) => setEducation((rows) => rows.map((row, i) => i === index ? { ...row, field_of_study: event.target.value } : row))} className="rounded-sm border border-border px-3 py-2" dir="ltr" />
              <input placeholder={t("year")} value={item.graduation_year} onChange={(event) => setEducation((rows) => rows.map((row, i) => i === index ? { ...row, graduation_year: event.target.value } : row))} className="rounded-sm border border-border px-3 py-2" dir="ltr" />
              {templateType === "academic" ? (
                <input placeholder={t("thesis")} value={item.thesis_title} onChange={(event) => setEducation((rows) => rows.map((row, i) => i === index ? { ...row, thesis_title: event.target.value } : row))} className="rounded-sm border border-border px-3 py-2 sm:col-span-2" dir="ltr" />
              ) : null}
            </div>
          ))}
        </section>

        {templateType === "academic" ? (
          <section className="space-y-3 rounded-lg border border-border p-4">
            <h2 className="font-bold">{t("publications")}</h2>
            {publications.map((item, index) => (
              <div key={index} className="grid gap-2">
                <input placeholder={t("pub_title")} value={item.title} onChange={(event) => setPublications((rows) => rows.map((row, i) => i === index ? { ...row, title: event.target.value } : row))} className="rounded-sm border border-border px-3 py-2" dir="ltr" />
                <input placeholder={t("venue")} value={item.journal_conference} onChange={(event) => setPublications((rows) => rows.map((row, i) => i === index ? { ...row, journal_conference: event.target.value } : row))} className="rounded-sm border border-border px-3 py-2" dir="ltr" />
              </div>
            ))}
          </section>
        ) : null}

        <section className="space-y-3 rounded-lg border border-border p-4">
          <h2 className="font-bold">{t("signature")}</h2>
          <div className="flex gap-2">
            <button type="button" className="rounded-full bg-muted px-3 py-1 text-sm font-bold" onClick={() => setSignatureMode("draw")}>{t("draw")}</button>
            <button type="button" className="rounded-full bg-muted px-3 py-1 text-sm font-bold" onClick={() => setSignatureMode("upload")}>{t("upload")}</button>
          </div>
          {signatureMode === "draw" ? (
            <SignaturePad onChange={setSignatureDataUrl} />
          ) : (
            <input
              type="file"
              accept="image/png,image/jpeg"
              onChange={(event) => {
                const file = event.target.files?.[0];
                if (!file) return;
                const reader = new FileReader();
                reader.onload = () => setSignatureDataUrl(String(reader.result || ""));
                reader.readAsDataURL(file);
              }}
            />
          )}
        </section>

        <Button type="button" onClick={save} disabled={saving} className="h-12 rounded-xl bg-primary font-bold text-primary-foreground">
          {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : t("save")}
        </Button>
      </div>
      <div className="overflow-hidden rounded-lg border border-border">
        <AtsCvDocument cv={preview} signatureSrc={signatureSrc} />
      </div>
    </div>
  );
}
