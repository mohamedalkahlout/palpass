"use client";

import { useTranslations } from "next-intl";
import { CivicServiceShell } from "@/components/layout/CivicServiceShell";

export default function TermsPage() {
  const t = useTranslations("Legal");

  return (
    <CivicServiceShell title={t("terms_title")} description={t("terms_desc")} />
  );
}
