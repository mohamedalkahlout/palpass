"use client";

import { useState } from "react";
import { useTranslations } from "next-intl";
import { EagleWatermark, OfficialCrest } from "@/components/brand/BrandMark";
import { TatreezDivider } from "@/components/ui/TatreezDivider";

const TYPES = ["all", "presidential_decree", "cabinet_decision", "ministerial_instruction"];
const EASE = "transition-all duration-[250ms] ease-[cubic-bezier(0.16,1,0.3,1)] motion-reduce:transition-none";

export function GazetteClient({ editions = [], query = "", type = "all" }) {
  const t = useTranslations("Gazette");
  const [openId, setOpenId] = useState(null);

  return (
    <div className="space-y-6">
      <header className="relative overflow-hidden rounded-lg border-2 border-emerald-900/20 bg-card p-6 text-center dark:border-emerald-500/20 sm:p-8">
        <EagleWatermark className="opacity-5 dark:opacity-10" opacity={1} />
        <div className="relative">
          <OfficialCrest size={64} />
          <h1 className="mt-3 text-2xl font-black text-[#064e3b] dark:text-emerald-50 sm:text-3xl">{t("title")}</h1>
          <p className="mx-auto mt-2 max-w-2xl text-sm text-foreground dark:text-zinc-400">{t("subtitle")}</p>
          <TatreezDivider className="my-6 opacity-15" />
        </div>
      </header>
      <form method="get" className="grid grid-cols-1 gap-3 rounded-lg border bg-card p-4 min-[768px]:grid-cols-[1fr_220px_auto] border-border">
        <input name="q" defaultValue={query} placeholder={t("search")} className={`min-w-0 rounded-md border border-emerald-900/15 bg-white px-4 py-3 dark:bg-zinc-950 ${EASE}`} />
        <select name="type" defaultValue={TYPES.includes(type) ? type : "all"} className={`rounded-md border border-emerald-900/15 bg-white px-4 py-3 dark:bg-zinc-950 ${EASE}`}>
          {TYPES.map((item) => <option key={item} value={item}>{t(item)}</option>)}
        </select>
        <button type="submit" className={`rounded-md bg-[#064e3b] px-5 py-3 font-bold text-white ${EASE}`}>{t("filter")}</button>
      </form>
      {editions.length === 0 ? <p className="text-center text-foreground">{t("empty")}</p> : editions.map((edition) => (
        <article key={edition.id} className="rounded-lg border border-[#b45309]/30 bg-white/90 p-5 shadow-sm dark:bg-zinc-900/85">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <p className="font-black text-[#064e3b] dark:text-emerald-50">{t("edition")} {edition.edition_number}</p>
            <p className="text-xs font-bold text-[#b45309]">{t(edition.decree_type)}</p>
          </div>
          <h2 className="mt-2 break-words text-lg font-black text-[#1c1917] dark:text-zinc-50">{edition.title}</h2>
          <p className="mt-1 text-xs text-muted-foreground">{t("issued")}: {String(edition.issuance_date).slice(0, 10)}</p>
          <p className="mt-3 break-words text-sm leading-relaxed text-foreground dark:text-zinc-300">{edition.summary}</p>
          <button type="button" onClick={() => setOpenId(openId === edition.id ? null : edition.id)} className={`mt-4 rounded-md border border-emerald-700/30 px-4 py-2 text-sm font-bold text-[#064e3b] dark:text-emerald-100 ${EASE}`}>
            {openId === edition.id ? t("hide") : t("read")}
          </button>
          {openId === edition.id ? (
            <pre className="mt-4 whitespace-pre-wrap break-words rounded-md border border-emerald-900/10 bg-background p-4 font-sans text-sm leading-7 text-[#1c1917] dark:bg-zinc-950 dark:text-zinc-100">{edition.full_text}</pre>
          ) : null}
        </article>
      ))}
    </div>
  );
}
