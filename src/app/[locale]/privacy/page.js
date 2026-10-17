"use client";

import { useTranslations } from "next-intl";
import { CivicServiceShell } from "@/components/layout/CivicServiceShell";

export default function PrivacyPage() {
  const t = useTranslations("Legal");

  return (
    <CivicServiceShell title={t("privacy_title")} description={t("privacy_desc")} />
  );
}
