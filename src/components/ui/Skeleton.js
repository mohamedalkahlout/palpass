/**
 * PALPASS — Apple-Style Skeleton Loaders
 * 
 * Usage:
 *   import { Skeleton, CardSkeleton, ProfileSkeleton, TableRowSkeleton } from "@/components/ui/Skeleton";
 * 
 *   {isLoading ? <CardSkeleton /> : <ActualContent />}
 */

// ── Base shimmer element ────────────────────────────────────────
export function Skeleton({ className = "" }) {
  return (
    <div
      className={`animate-pulse rounded-xl bg-black/[0.06] dark:bg-white/[0.06] ${className}`}
    />
  );
}

// ── Generic card skeleton ───────────────────────────────────────
export function CardSkeleton() {
  return (
    <div className="rounded-lg border border-border bg-card p-6 space-y-4">
      <Skeleton className="h-5 w-2/3" />
      <Skeleton className="h-4 w-full" />
      <Skeleton className="h-4 w-5/6" />
      <Skeleton className="h-4 w-1/2" />
      <Skeleton className="h-10 w-32 mt-2 rounded-xl" />
    </div>
  );
}

// ── Profile sidebar skeleton ────────────────────────────────────
export function ProfileSkeleton() {
  return (
    <div className="rounded-lg border border-border bg-card overflow-hidden">
      <Skeleton className="h-24 w-full rounded-none" />
      <div className="px-6 pb-6 flex flex-col items-center gap-3 -mt-12">
        <Skeleton className="w-24 h-24 rounded-lg" />
        <Skeleton className="h-5 w-40 mt-2" />
        <Skeleton className="h-3 w-28" />
        <div className="flex gap-2 mt-1">
          <Skeleton className="h-6 w-20 rounded-full" />
          <Skeleton className="h-6 w-16 rounded-full" />
        </div>
        <Skeleton className="h-9 w-full rounded-xl mt-2" />
        <Skeleton className="h-9 w-full rounded-xl" />
      </div>
    </div>
  );
}

// ── List row skeleton ───────────────────────────────────────────
export function TableRowSkeleton({ rows = 3 }) {
  return (
    <div className="space-y-3">
      {Array.from({ length: rows }).map((_, i) => (
        <div key={i} className="flex items-center gap-4 p-3">
          <Skeleton className="w-10 h-10 rounded-xl shrink-0" />
          <div className="flex-1 space-y-2">
            <Skeleton className="h-4 w-3/4" />
            <Skeleton className="h-3 w-1/2" />
          </div>
          <Skeleton className="h-8 w-20 rounded-xl" />
        </div>
      ))}
    </div>
  );
}

// ── Notification skeleton ────────────────────────────────────────
export function NotificationSkeleton({ count = 3 }) {
  return (
    <div className="space-y-2">
      {Array.from({ length: count }).map((_, i) => (
        <div key={i} className="p-3 rounded-xl space-y-1.5">
          <Skeleton className="h-3.5 w-2/3" />
          <Skeleton className="h-3 w-full" />
          <Skeleton className="h-2.5 w-16" />
        </div>
      ))}
    </div>
  );
}

// ── Restaurant / Job card grid skeleton ─────────────────────────
export function GridCardSkeleton({ count = 6 }) {
  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
      {Array.from({ length: count }).map((_, i) => (
        <div key={i} className="rounded-lg border border-border bg-card overflow-hidden">
          <Skeleton className="h-48 w-full rounded-none" />
          <div className="p-5 space-y-3">
            <Skeleton className="h-5 w-3/4" />
            <Skeleton className="h-4 w-full" />
            <Skeleton className="h-4 w-2/3" />
            <div className="flex gap-2 pt-1">
              <Skeleton className="h-6 w-16 rounded-full" />
              <Skeleton className="h-6 w-20 rounded-full" />
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}

// ── Wallet card skeleton ─────────────────────────────────────────
export function WalletSkeleton() {
  return (
    <div className="rounded-lg border border-border bg-card p-6 space-y-3">
      <div className="flex justify-between items-start">
        <Skeleton className="h-12 w-12 rounded-lg" />
        <Skeleton className="h-6 w-20 rounded-full" />
      </div>
      <Skeleton className="h-4 w-32 mt-2" />
      <Skeleton className="h-10 w-48" />
      <Skeleton className="h-9 w-full rounded-xl mt-1" />
    </div>
  );
}

// ── Hero section skeleton ────────────────────────────────────────
export function HeroSkeleton() {
  return (
    <div className="relative min-h-[85vh] flex items-center justify-center px-4">
      <div className="text-center space-y-4 max-w-2xl">
        <Skeleton className="h-6 w-32 rounded-full mx-auto" />
        <Skeleton className="h-16 w-3/4 mx-auto" />
        <Skeleton className="h-16 w-2/3 mx-auto" />
        <Skeleton className="h-6 w-1/2 mx-auto mt-4" />
        <div className="flex gap-3 justify-center mt-6">
          <Skeleton className="h-12 w-32 rounded-full" />
          <Skeleton className="h-12 w-32 rounded-full" />
        </div>
      </div>
    </div>
  );
}
