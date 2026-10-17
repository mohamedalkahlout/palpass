"use client";

import { QRCodeSVG } from "qrcode.react";
import { FadeIn } from "@/components/animations/FadeIn";
import Image from "next/image";
import { ShieldCheck } from "lucide-react";
import { useTranslations } from "next-intl";
import { EagleWatermark } from "@/components/brand/BrandMark";
import { civicImageSrc } from "@/lib/images/civic-image";

export function QRCodeCard({ data }) {
  const t = useTranslations("Identity");
  const underReview = !data.is_verified || data.status === "pending";
  const qrString = JSON.stringify({
    name: data.name,
    id: data.id_number,
    verified: data.is_verified,
    platform: "PALPASS",
  });

  return (
    <FadeIn delay={0.05}>
      <article className="relative w-full overflow-hidden rounded-lg select-none border border-[color:var(--gold)]/35">
        <div className="absolute inset-0 bg-[color:var(--brand-900)]" />
        <EagleWatermark opacity={0.14} />

        <div className="relative z-10 p-6 flex flex-col gap-5">
          <header className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Image
                src="/images/branding/palpass-logo.png"
                alt="PALPASS"
                width={28}
                height={28}
                className="rounded-[22%] ring-1 ring-white/20 bg-white"
              />
              <span className="text-white font-black text-base tracking-tight">PALPASS</span>
            </div>
            <Image
              src="/images/branding/palestine-eagle.png"
              alt=""
              width={36}
              height={44}
              className="object-contain opacity-90"
            />
          </header>

          <div className="flex items-center gap-4">
            {civicImageSrc(data.avatar) && (
              <div className="relative w-14 h-14 rounded-lg overflow-hidden ring-2 ring-white/20 shrink-0">
                <Image src={civicImageSrc(data.avatar)} alt={data.name} fill className="object-cover" />
              </div>
            )}
            <div className="flex-1 min-w-0">
              <p className="text-white font-bold text-base leading-tight truncate">{data.name}</p>
              <p className="text-white/70 text-[10px] font-mono tracking-widest mt-1" dir="ltr">
                {t("id_label")}: {data.id_number}
              </p>
              <div
                className={`inline-flex items-center gap-1 mt-2 text-[10px] font-bold px-2.5 py-1 rounded-full ${
                  underReview
                    ? "bg-amber-500/25 text-amber-100"
                    : "bg-emerald-500/20 text-emerald-300"
                }`}
              >
                <ShieldCheck className="w-3 h-3" />
                {underReview ? t("under_review") : t("verified")}
              </div>
            </div>
          </div>

          <div className="flex justify-center">
            <div className={`relative rounded-lg border-2 border-[#d97706] bg-white p-3 shadow-[0_0_0_4px_rgba(180,83,9,0.18)] ${underReview ? "opacity-50" : ""}`}>
              <QRCodeSVG
                value={qrString}
                size={140}
                bgColor="#ffffff"
                fgColor="#0f172a"
                level="Q"
                marginSize={0}
              />
              {underReview ? (
                <div className="absolute inset-0 flex items-center justify-center bg-amber-950/35 px-3 text-center">
                  <span className="rounded-full bg-amber-400 px-3 py-1 text-[10px] font-black text-amber-950">
                    {t("qr_inactive")}
                  </span>
                </div>
              ) : null}
            </div>
          </div>

          <footer className="flex items-center justify-between text-white/55 text-[9px] font-semibold tracking-wide">
            <span>{t("card_label")}</span>
            <span>{t("state")}</span>
          </footer>
        </div>
      </article>
    </FadeIn>
  );
}
