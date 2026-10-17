import Link from "next/link";
import { FileQuestion, Home, ArrowLeft } from "lucide-react";

export default function NotFound() {
  return (
    <main className="min-h-[70vh] flex items-center justify-center px-4 py-16 bg-background">
      <div className="w-full max-w-lg rounded-2xl border border-border/80 bg-card p-8 shadow-sm text-center">
        <div className="mx-auto mb-6 flex h-16 w-16 items-center justify-center rounded-2xl bg-muted text-foreground border border-border">
          <FileQuestion className="h-8 w-8 text-primary" aria-hidden="true" />
        </div>

        <h1 className="text-2xl font-bold tracking-tight text-foreground sm:text-3xl">
          الصفحة المطلوبة غير موجودة (404)
        </h1>
        <p className="mt-1 text-sm font-medium text-muted-foreground">
          Page Not Found
        </p>

        <p className="mt-4 text-sm leading-relaxed text-muted-foreground">
          لم يتم العثور على الرابط المطلوب في منظومة PALPASS. قد يكون الرابط قد تغيّر أو تم نقله.
        </p>
        <p className="mt-2 text-xs text-muted-foreground/80">
          The requested route was not found in the official PALPASS registry.
        </p>

        <div className="mt-8 flex flex-col sm:flex-row items-center justify-center gap-3">
          <Link
            href="/"
            className="inline-flex w-full sm:w-auto items-center justify-center gap-2 rounded-xl bg-primary px-6 py-3 text-sm font-bold text-primary-foreground shadow-sm transition hover:bg-primary/90 cursor-pointer"
          >
            <Home className="h-4 w-4" />
            <span>العودة للرئيسية &middot; Home</span>
          </Link>
          <Link
            href="/services"
            className="inline-flex w-full sm:w-auto items-center justify-center gap-2 rounded-xl border border-border bg-muted/60 px-6 py-3 text-sm font-semibold text-foreground transition hover:bg-muted"
          >
            <span>دليل الخدمات &middot; Services</span>
          </Link>
        </div>

        <div className="mt-8 pt-6 border-t border-border/60 text-[11px] text-muted-foreground font-mono">
          PALPASS &bull; دولة فلسطين
        </div>
      </div>
    </main>
  );
}
