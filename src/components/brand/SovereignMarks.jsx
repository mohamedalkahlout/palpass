import Image from "next/image";

export function PalpassIcon({ className = "h-10 w-10" }) {
  return (
    <span className={`relative inline-flex shrink-0 items-center justify-center overflow-hidden rounded-[22%] ring-1 ring-border/50 shadow-sm transition-transform duration-300 hover:scale-105 ${className}`}>
      <Image
        src="/images/branding/palpass-logo.png"
        alt="PALPASS"
        width={40}
        height={40}
        className="h-full w-full object-cover"
        priority
      />
    </span>
  );
}

export function NationalEmblem({ className = "h-8 w-7" }) {
  return (
    <svg viewBox="0 0 80 96" className={className} aria-hidden="true">
      <path className="fill-none stroke-[#064e3b] dark:stroke-[#34d399]" strokeWidth="2" d="M40 3 L74 16 V46 C74 68 40 93 40 93 C40 93 6 68 6 46 V16 Z" />
      <path className="fill-[#064e3b] dark:fill-[#34d399]" d="M40 24c-8 0-16 6-22 12 6-1 12 2 22 2s16-3 22-2c-6-6-14-12-22-12z" />
      <path className="fill-[#064e3b] dark:fill-[#34d399]" d="M18 38c-8 2-14 8-16 14 8-2 14-1 20 3 2-6 2-12-4-17z" />
      <path className="fill-[#064e3b] dark:fill-[#34d399]" d="M62 38c8 2 14 8 16 14-8-2-14-1-20 3-2-6-2-12 4-17z" />
      <circle className="fill-[#064e3b] dark:fill-[#34d399]" cx="40" cy="30" r="3.2" />
      <path className="fill-[#064e3b] dark:fill-[#34d399]" d="M44 31l6 1.2-6 1.6z" />
      <path className="fill-[#064e3b] dark:fill-[#34d399]" d="M40 42c-6 8-8 16-8 24h16c0-8-2-16-8-24z" />
      <path className="fill-[#064e3b] dark:fill-[#34d399]" d="M28 78h24l-4 8H32z" />
    </svg>
  );
}
