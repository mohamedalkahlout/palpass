"use client";

import Image from "next/image";
import { QRCodeSVG } from "qrcode.react";
import { StatusTag } from "@/components/ui/StatusTag";
import { civicImageSrc } from "@/lib/images/civic-image";

function maskNationalId(value) {
  const digits = String(value || "").replace(/\D/g, "");
  const tail = digits.slice(-3).padStart(3, "•");
  return `***-***-${tail}`;
}

export function SmartIDCard({
  fullName,
  nationalId,
  photoUrl,
  verified = false,
  statusLabel,
  locale = "ar",
}) {
  const safePhoto = civicImageSrc(photoUrl);
  const verifyPath = nationalId
    ? `/api/verify?national_id=${encodeURIComponent(String(nationalId).replace(/\D/g, ""))}`
    : "/api/verify";
  const verifiedLabel = statusLabel || (locale === "ar" ? "موثق / معتمد" : "Verified");
  const pendingLabel = statusLabel || (locale === "ar" ? "قيد الاعتماد" : "Pending accreditation");

  return (
    <article
      className="relative w-full max-w-xl overflow-hidden rounded-lg border border-[color:var(--gold-700)] text-[#fafaf9]"
      style={{ aspectRatio: "1.586 / 1", backgroundColor: "#064e3b" }}
    >
      {/* Subtle sovereign watermark */}
      <div className="pointer-events-none absolute inset-0 flex items-center justify-center overflow-hidden opacity-[0.07]" aria-hidden>
        <Image
          src="/images/branding/palpass-logo.png"
          alt=""
          width={240}
          height={240}
          className="object-contain"
        />
      </div>

      <div className="pointer-events-none absolute inset-x-0 bottom-3 opacity-[0.1]" aria-hidden>
        <svg viewBox="0 0 320 16" className="h-4 w-full" fill="#fafaf9">
          {[16, 48, 80, 112, 144, 176, 208, 240, 272, 304].map((x) => (
            <g key={x} transform={`translate(${x} 8)`}>
              <rect x="-2.2" y="-2.2" width="4.4" height="4.4" />
              <rect x="-2.2" y="-2.2" width="4.4" height="4.4" transform="rotate(45)" />
            </g>
          ))}
        </svg>
      </div>
      <div className="relative flex h-full gap-4 p-4 sm:p-5">
        <div className="flex h-16 w-14 shrink-0 items-center justify-center overflow-hidden rounded-sm border border-[#f59e0b] bg-[#022c22]">
          {safePhoto ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={safePhoto} alt="" className="h-full w-full object-cover" />
          ) : (
            <span className="text-[10px] font-semibold text-[#fafaf9]/80">{locale === "ar" ? "صورة" : "Photo"}</span>
          )}
        </div>
        <div className="flex min-w-0 flex-1 flex-col">
          <div className="flex items-start justify-between gap-3">
            <div className="min-w-0">
              <p className="text-[10px] font-semibold tracking-wide text-[#f59e0b]">PALPASS</p>
              <h2 className="truncate font-document text-lg font-bold leading-tight">{fullName || "—"}</h2>
            </div>
            <div className="relative h-9 w-9 shrink-0 overflow-hidden rounded-[22%] ring-1 ring-[#f59e0b]/50 shadow-sm bg-white/10" aria-hidden="true">
              <Image
                src="/images/branding/palpass-logo.png"
                alt="PALPASS"
                width={36}
                height={36}
                className="h-full w-full object-cover"
              />
            </div>
          </div>
          <p className="mt-2 font-mono text-sm tabular-nums tracking-wide" dir="ltr">
            {maskNationalId(nationalId)}
          </p>
          <div className="mt-auto flex items-end justify-between gap-3">
            <StatusTag inverse status={verified ? "active" : "pending"}>{verified ? verifiedLabel : pendingLabel}</StatusTag>
            <span className="rounded-sm bg-[#fafaf9] p-1">
              <QRCodeSVG value={verifyPath} size={64} level="M" bgColor="#fafaf9" fgColor="#064e3b" />
            </span>
          </div>
        </div>
      </div>
    </article>
  );
}
