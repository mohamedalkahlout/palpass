import { getUserBorderPermits } from "@/app/actions";
import { getCurrentUser } from "@/lib/supabase/server";
import { getWalletBalance } from "@/lib/supabase/service";
import {
  governmentServiceMetadata,
  governmentServiceJsonLd,
} from "@/lib/seo/government-metadata";
import { BorderClient } from "./BorderClient";
import { ServiceFrame } from "@/components/ui/ServiceFrame";

export async function generateMetadata({ params }) {
  const { locale } = await params;
  return governmentServiceMetadata({
    locale,
    path: "/services/border",
    titleAr: "تصاريح المعابر | PALPASS",
    titleEn: "Border Crossing Permits | PALPASS",
    descAr: "طلب وتتبع تصاريح السفر الرسمية لمعابر الكرامة ورفح وإيريز.",
    descEn: "Request and track official travel permits for Karameh, Rafah, and Erez crossings.",
  });
}

export default async function BorderPage({ params }) {
  const { locale } = await params;
  let result = { permits: [], accredited: false, success: false };
  try {
    result = await getUserBorderPermits();
  } catch (err) {
    console.error("[Handled SSR Exception - Border Permits]:", err?.message);
    result = { permits: [], accredited: false, success: false, error: "تعذر تحميل التصاريح مؤقتاً." };
  }

  let user = null;
  try {
    user = await getCurrentUser();
  } catch (err) {
    console.error("[Handled SSR Exception - Border User]:", err?.message);
    user = null;
  }

  let walletBalance = null;
  if (user) {
    try {
      walletBalance = await getWalletBalance(user.id);
    } catch (err) {
      console.error("[Handled SSR Exception - Border Wallet]:", err?.message);
      walletBalance = null;
    }
  }

  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{
          __html: JSON.stringify(
            governmentServiceJsonLd({
              locale,
              path: "/services/border",
              nameAr: "إدارة تصاريح المعابر",
              nameEn: "Travel Permits and Crossing Administration",
              descriptionAr: "تنسيق السفر عبر المعابر الرسمية مع إشعارات الاعتماد.",
              descriptionEn: "Coordinate travel via official crossings with approval notices.",
            })
          ),
        }}
      />
      <ServiceFrame service="border">
        <BorderClient
          initialPermits={result?.permits || []}
          gateError={result?.success ? null : result?.error}
          accredited={result?.accredited !== false}
          walletBalance={walletBalance}
        />
      </ServiceFrame>
    </>
  );
}
