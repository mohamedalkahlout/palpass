import { createClient, getCurrentUser } from "@/lib/supabase/server";
import { getBills, getWallet } from "@/lib/supabase/service";
import { BillsClient } from "./BillsClient";
import { ServiceFrame } from "@/components/ui/ServiceFrame";
import {
  governmentServiceMetadata,
  governmentServiceJsonLd,
} from "@/lib/seo/government-metadata";

export async function generateMetadata({ params }) {
  const { locale } = await params;
  return governmentServiceMetadata({
    locale,
    path: "/services/bills",
    titleAr: "PALPASS | الفواتير والمستحقات الحكومية",
    titleEn: "PALPASS | Government Bills and Dues",
    descAr: "سداد فواتير الكهرباء والمياه والاتصالات من المحفظة الرقمية الوطنية.",
    descEn: "Pay electricity, water, and telecom bills from the national digital wallet.",
  });
}

/**
 * Server Component — single-trip wallet + bills load with resilient fallback pattern.
 */
export default async function BillsPage({ params }) {
  const { locale } = await params;
  let user = null;
  try {
    user = await getCurrentUser();
  } catch (err) {
    console.error("[Handled SSR Exception - Bills User]:", err?.message);
    user = null;
  }

  if (!user) {
    return (
      <ServiceFrame service="bills">
        <BillsClient initialBills={[]} initialWallet={null} accredited={false} guest />
      </ServiceFrame>
    );
  }

  let bills = [];
  let wallet = null;
  let accredited = false;

  try {
    const supabase = await createClient();
    const [billsData, walletData, profileResult] = await Promise.all([
      getBills(user.id),
      getWallet(user.id),
      supabase.from("profiles").select("status, is_verified").eq("id", user.id).maybeSingle(),
    ]);
    bills = billsData || [];
    wallet = walletData || null;
    const profile = profileResult?.data;
    accredited = profile?.status === "active" && profile?.is_verified === true;
  } catch (err) {
    console.error("[Handled SSR Exception - Bills Data]:", err?.message);
    bills = [];
    wallet = null;
    accredited = false;
  }

  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{
          __html: JSON.stringify(
            governmentServiceJsonLd({
              locale,
              path: "/services/bills",
              nameAr: "الفواتير والمستحقات الحكومية",
              nameEn: "Government bills and dues",
              descriptionAr: "تسديد المستحقات الحكومية عبر المحفظة الرقمية.",
              descriptionEn: "Settle government dues through the digital wallet.",
            })
          ),
        }}
      />
      <ServiceFrame service="bills">
        <BillsClient initialBills={bills} initialWallet={wallet} accredited={accredited} />
      </ServiceFrame>
    </>
  );
}
