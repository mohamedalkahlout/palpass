function formatRange(start, end, current) {
  const from = start || "";
  const to = current ? "Present" : end || "";
  if (!from && !to) return "";
  return `${from}${to ? ` - ${to}` : ""}`;
}

export function AtsCvDocument({ cv, signatureSrc }) {
  if (!cv) return null;
  const info = cv.personal_info || cv.personalInfo || {};
  const academic = (cv.template_type || cv.templateType) === "academic";
  const skills = cv.skills || [];
  const experience = cv.work_experience || cv.workExperience || [];
  const education = cv.education || [];
  const certifications = cv.certifications || [];
  const publications = cv.academic_publications || cv.publications || [];
  const languages = cv.languages || [];

  return (
    <article className="mx-auto max-w-3xl bg-white px-8 py-10 text-black" lang="en" dir="ltr">
      <header>
        <h1 className="text-2xl font-bold">{info.full_name_en || "Applicant"}</h1>
        {info.professional_title ? <p className="mt-1 text-base">{info.professional_title}</p> : null}
        <p className="mt-2 text-sm">
          {[info.email, info.phone, info.location, info.linkedin, info.portfolio].filter(Boolean).join(" | ")}
        </p>
      </header>

      {cv.summary ? (
        <section className="mt-6">
          <h2 className="border-b border-black text-lg font-bold">
            {academic ? "Research Interests" : "Professional Summary"}
          </h2>
          <p className="mt-2 whitespace-pre-line text-sm leading-6">{cv.summary}</p>
        </section>
      ) : null}

      {academic ? (
        <section className="mt-6">
          <h2 className="border-b border-black text-lg font-bold">Education</h2>
          {education.map((item, index) => (
            <div key={`${item.institution}-${index}`} className="mt-3">
              <h3 className="text-base font-bold">{item.degree}{item.field_of_study ? `, ${item.field_of_study}` : ""}</h3>
              <p className="text-sm">{item.institution}{item.graduation_year ? ` | ${item.graduation_year}` : ""}</p>
              {item.gpa_or_honors ? <p className="text-sm">{item.gpa_or_honors}</p> : null}
              {item.thesis_title ? <p className="text-sm">Thesis: {item.thesis_title}</p> : null}
            </div>
          ))}
        </section>
      ) : null}

      {!academic && skills.length > 0 ? (
        <section className="mt-6">
          <h2 className="border-b border-black text-lg font-bold">Core Competencies</h2>
          <ul className="mt-2 list-disc ps-5 text-sm leading-6">
            {skills.map((skill) => (
              <li key={skill}>{skill}</li>
            ))}
          </ul>
        </section>
      ) : null}

      {experience.length > 0 ? (
        <section className="mt-6">
          <h2 className="border-b border-black text-lg font-bold">
            {academic ? "Teaching and University Appointments" : "Work Experience"}
          </h2>
          {experience.map((item, index) => (
            <div key={`${item.company}-${index}`} className="mt-3">
              <h3 className="text-base font-bold">{item.role}</h3>
              <p className="text-sm">
                {[item.company, item.location, formatRange(item.start_date, item.end_date, item.is_current)]
                  .filter(Boolean)
                  .join(" | ")}
              </p>
              <ul className="mt-1 list-disc ps-5 text-sm leading-6">
                {(item.bullet_points || []).filter(Boolean).map((point) => (
                  <li key={point}>{point}</li>
                ))}
              </ul>
            </div>
          ))}
        </section>
      ) : null}

      {academic && publications.length > 0 ? (
        <section className="mt-6">
          <h2 className="border-b border-black text-lg font-bold">Publications and Conference Proceedings</h2>
          {publications.map((item, index) => (
            <p key={`${item.title}-${index}`} className="mt-2 text-sm leading-6">
              {item.authors ? `${item.authors}. ` : ""}
              {item.title}
              {item.journal_conference ? `. ${item.journal_conference}` : ""}
              {item.year ? ` (${item.year})` : ""}
              {item.doi_or_link ? `. ${item.doi_or_link}` : ""}
            </p>
          ))}
        </section>
      ) : null}

      {!academic && certifications.length > 0 ? (
        <section className="mt-6">
          <h2 className="border-b border-black text-lg font-bold">Certifications</h2>
          {certifications.map((item, index) => (
            <p key={`${item.name}-${index}`} className="mt-2 text-sm">
              {item.name}
              {item.issuing_org ? ` — ${item.issuing_org}` : ""}
              {item.issue_date ? ` (${item.issue_date})` : ""}
              {item.credential_id ? ` · ${item.credential_id}` : ""}
            </p>
          ))}
        </section>
      ) : null}

      {academic && skills.length > 0 ? (
        <section className="mt-6">
          <h2 className="border-b border-black text-lg font-bold">Grants and Honors</h2>
          <ul className="mt-2 list-disc ps-5 text-sm leading-6">
            {skills.map((skill) => (
              <li key={skill}>{skill}</li>
            ))}
          </ul>
        </section>
      ) : null}

      {!academic ? (
        <section className="mt-6">
          <h2 className="border-b border-black text-lg font-bold">Education</h2>
          {education.map((item, index) => (
            <div key={`${item.institution}-${index}`} className="mt-3">
              <h3 className="text-base font-bold">{item.degree}{item.field_of_study ? `, ${item.field_of_study}` : ""}</h3>
              <p className="text-sm">{item.institution}{item.graduation_year ? ` | ${item.graduation_year}` : ""}</p>
            </div>
          ))}
        </section>
      ) : null}

      {languages.length > 0 ? (
        <section className="mt-6">
          <h2 className="border-b border-black text-lg font-bold">Languages</h2>
          <ul className="mt-2 list-disc ps-5 text-sm">
            {languages.map((item, index) => (
              <li key={`${item.language}-${index}`}>{item.language}{item.proficiency ? ` — ${item.proficiency}` : ""}</li>
            ))}
          </ul>
        </section>
      ) : null}

      <footer className="mt-8 border-t border-black pt-4">
        {signatureSrc ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={signatureSrc} alt="Personal signature" className="h-16 w-auto" />
        ) : null}
        <p className="mt-2 text-xs">
          Issued {new Date().toLocaleDateString("en-GB")}
          {info.verification_hash ? ` · Verification ${info.verification_hash}` : ""}
        </p>
      </footer>
    </article>
  );
}
