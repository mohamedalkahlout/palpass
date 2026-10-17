import { headers } from "next/headers";
import {
  governmentServiceMetadata,
  governmentServiceJsonLd,
} from "@/lib/seo/government-metadata";
import { TatreezDivider } from "@/components/ui/TatreezDivider";
import { lookupTracking } from "@/lib/civic/tracking";
import { TrackPortal } from "./TrackPortal";

export async function generateMetadata({ params }) {
  const { locale } = await params;
  return governmentServiceMetadata({
    locale,
    path: "/track",
    titleAr: "تتبع الطلبات والمعاملات | PALPASS",
    titleEn: "Request & Transaction Tracking | PALPASS",
    descAr: "تتبع حالة الطلبات والتظلمات والتصاريح والشهادات الصادرة عن دولة فلسطين برقم المرجع.",
    descEn: "Track the status of requests, grievances, permits, and certificates issued by the State of Palestine by reference number.",
  });
}

export default async function TrackPage({ params, searchParams }) {
  const { locale } = await params;
  const sp = await searchParams;
  const reference = String(sp?.ref || "").trim();
  const headerStore = await headers();
  const forwarded = headerStore.get("x-forwarded-for") || "";
  const clientIp = forwarded.split(",")[0].trim() || headerStore.get("x-real-ip") || "local";
  const result = reference ? await lookupTracking(reference, clientIp) : null;
  const isAr = locale === "ar";

  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{
          __html: JSON.stringify(
            governmentServiceJsonLd({
              locale,
              path: "/track",
              nameAr: "خدمة تتبع الطلبات والمعاملات",
              nameEn: "Request and transaction tracking service",
              descriptionAr: "متابعة حالة الطلبات والتظلمات والتصاريح برقم المرجع الوطني.",
              descriptionEn: "Follow the status of requests, grievances, and permits by national reference number.",
            })
          ),
        }}
      />
      <article className="page-wrap grid gap-6 py-8">
        <header className="border-b border-border pb-4">
          <p className="text-xs font-semibold tracking-wide text-[color:var(--brand-900)]">
            {isAr ? "دولة فلسطين — السجل المركزي للمتابعة" : "State of Palestine — Central Tracking Registry"}
          </p>
          <h1 className="mt-1 text-2xl font-bold text-foreground">
            {isAr ? "تتبع الطلبات والمعاملات" : "Request and transaction tracking"}
          </h1>
          <TatreezDivider className="justify-start" />
        </header>
        <TrackPortal key={reference || "empty"} initialRef={reference} result={result} />
      </article>
    </>
  );
}
