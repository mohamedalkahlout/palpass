"use client";

import { useTranslations } from "next-intl";
import { ServicePage } from "@/components/ui/ServicePage";

const DEFAULT_CIVIC_IMAGES = {
  family: { src: "/images/civic/family-civil.webp", alt: "دفتر العائلة والوثائق المدنية" },
  civil: { src: "/images/civic/family-civil.webp", alt: "الأحوال المدنية والهوية الوطنية" },
  government: { src: "/images/civic/family-civil.webp", alt: "جواز السفر الفلسطيني والوثائق الحكومية" },
  border: { src: "/images/civic/crossings-transit.webp", alt: "المعابر والاستراحة الفلسطينية" },
  transport: { src: "/images/civic/crossings-transit.webp", alt: "النقل والمواصلات العامة" },
  agriculture: { src: "/images/civic/olive-agriculture.webp", alt: "الأراضي والكروم والزيتون الفلسطيني" },
  aid: { src: "/images/civic/olive-agriculture.webp", alt: "المساعدات وصمود الأسر الفلسطينية" },
  "aid-ration": { src: "/images/civic/olive-agriculture.webp", alt: "السلال الإغاثية والتموينية الوطنية" },
  "cabinet-aid": { src: "/images/civic/olive-agriculture.webp", alt: "مساعدات مجلس الوزراء للمتضررين" },
  education: { src: "/images/civic/education-future.webp", alt: "التربية والتعليم العالي وبناء المستقبل" },
  hospitals: { src: "/images/civic/medical-care.webp", alt: "شبكة المستشفيات الوطنية" },
  healthcare: { src: "/images/civic/medical-care.webp", alt: "الرعاية الصحية الأولية والسجل الطبي" },
  "health-records": { src: "/images/civic/medical-care.webp", alt: "السجل الصحي الوطني الموحد" },
};

export function ServiceFrame({ service, heroImage, children }) {
  const t = useTranslations("ServiceLayout");
  const steps = [1, 2, 3].map((n) => ({
    id: `${service}-${n}`,
    label: t(`${service}.step_${n}`),
  }));

  const resolvedHeroImage = heroImage || DEFAULT_CIVIC_IMAGES[service];

  return (
    <ServicePage
      title={t(`${service}.title`)}
      authority={t(`${service}.authority`)}
      summary={{
        feeLabel: t("fee"),
        fee: t(`${service}.fee`),
        durationLabel: t("duration"),
        duration: t(`${service}.duration`),
        requirementsLabel: t("requirements"),
        requirements: t(`${service}.requirements`),
        departmentLabel: t("department"),
        department: t(`${service}.department`),
      }}
      steps={steps}
      heroImage={resolvedHeroImage}
    >
      {children}
    </ServicePage>
  );
}
