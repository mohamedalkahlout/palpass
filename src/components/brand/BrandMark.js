import Image from "next/image";
import { Link } from "@/i18n/routing";
import { cn } from "@/lib/utils";

export function BrandMark({
  size = 36,
  withWordmark = true,
  href = "/",
  className,
  wordmarkClassName,
}) {
  const mark = (
    <span className={cn("inline-flex items-center gap-2.5 select-none", className)}>
      <Image
        src="/images/branding/palpass-logo.png"
        alt="PALPASS"
        width={size}
        height={size}
        className="rounded-[22%] ring-1 ring-border shadow-sm bg-card transition-transform duration-300 hover:scale-105"
        priority
      />
      {withWordmark ? (
        <span
          className={cn(
            "font-black text-lg tracking-tight text-foreground leading-none",
            wordmarkClassName
          )}
        >
          PALPASS
        </span>
      ) : null}
    </span>
  );

  if (!href) return mark;

  return (
    <Link href={href} className="shrink-0 cursor-pointer">
      {mark}
    </Link>
  );
}

export function EagleWatermark({ className, opacity = 0.08 }) {
  return (
    <div
      className={cn(
        "sovereign-crest absolute inset-0 flex items-center justify-center overflow-hidden",
        className
      )}
      aria-hidden="true"
    >
      <Image
        src="/images/branding/palestine-eagle.png"
        alt=""
        width={480}
        height={580}
        className="object-contain max-h-[86%] w-auto"
        style={{ opacity }}
      />
    </div>
  );
}

export function OfficialCrest({ size = 56, className }) {
  return (
    <span className="relative inline-flex shrink-0" style={{ width: size, height: size }}>
      <span
        aria-hidden
        className="absolute inset-0 scale-125 rounded-full bg-[#064e3b]/30 blur-md"
      />
      <Image
        src="/images/branding/palestine-eagle.png"
        alt=""
        width={size}
        height={size}
        className={cn("relative object-contain", className)}
      />
    </span>
  );
}
