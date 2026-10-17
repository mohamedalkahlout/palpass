"use client";

import { useEffect } from "react";
import Link from "next/link";
import { AlertTriangle, RefreshCw, Home, ShieldAlert } from "lucide-react";

export default function LocaleError({ error, reset }) {
  useEffect(() => {
    if (error) {
      console.error("[PALPASS Resilient Error Boundary]:", error);
    }
  }, [error]);

  return (
    <main className="min-h-[70vh] flex items-center justify-center px-4 py-16 bg-background">
      <div className="w-full max-w-lg rounded-2xl border border-border/80 bg-card p-8 shadow-sm text-center">
        <div className="mx-auto mb-6 flex h-16 w-16 items-center justify-center rounded-2xl bg-primary/10 text-primary border border-primary/20">
          <ShieldAlert className="h-8 w-8 text-primary" aria-hidden="true" />
        </div>

        <h1 className="text-2xl font-bold tracking-tight text-foreground sm:text-3xl">
          تعذر معالجة الطلب مؤقتاً
        </h1>
        <p className="mt-1 text-sm font-medium text-muted-foreground">
          Temporary Service Notice
        </p>

        <p className="mt-4 text-sm leading-relaxed text-muted-foreground">
          نعتذر عن هذا الخلل المؤقت. نؤكد لكم أن أياً من معاملاتكم السيادية أو المالية لم تتأثر. يرجى المحاولة مجدداً أو العودة للصفحة الرئيسية.
        </p>
        <p className="mt-2 text-xs text-muted-foreground/80">
          No civic transaction or financial balance has been modified. Please retry or return home.
        </p>

        <div className="mt-8 flex flex-col sm:flex-row items-center justify-center gap-3">
          <button
            type="button"
            onClick={() => reset()}
            className="inline-flex w-full sm:w-auto items-center justify-center gap-2 rounded-xl bg-primary px-6 py-3 text-sm font-bold text-primary-foreground shadow-sm transition hover:bg-primary/90 cursor-pointer"
          >
            <RefreshCw className="h-4 w-4" />
            <span>حاول مجدداً &middot; Retry</span>
          </button>

          <Link
            href="/"
            className="inline-flex w-full sm:w-auto items-center justify-center gap-2 rounded-xl border border-border bg-muted/60 px-6 py-3 text-sm font-semibold text-foreground transition hover:bg-muted"
          >
            <Home className="h-4 w-4" />
            <span>الرئيسية &middot; Home</span>
          </Link>
        </div>

        <div className="mt-8 pt-6 border-t border-border/60 text-[11px] text-muted-foreground font-mono">
          PALPASS &bull; بوابة دولة فلسطين الرقمية الموحدة
        </div>
      </div>
    </main>
  );
}
