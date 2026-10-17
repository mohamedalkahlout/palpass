"use client";

import { useState, useEffect } from "react";
import { useTranslations, useLocale } from "next-intl";
import { Link } from "@/i18n/routing";
import { useAuth } from "@/components/auth/AuthProvider";
import { getCurrentProfile, getWallet, getTransactions } from "@/lib/supabase/service";
import { useRealtimeNotifications } from "@/hooks/useRealtimeNotifications";
import { HeroSkeleton, CardSkeleton, WalletSkeleton } from "@/components/ui/Skeleton";
import { Button } from "@/components/ui/button";
import { SmartIDCard } from "@/components/ui/SmartIDCard";
import { DataTable } from "@/components/ui/DataTable";
import { StatusTag } from "@/components/ui/StatusTag";
import { toast } from "sonner";
import { signOutCitizen } from "@/app/actions";
import { LogOut, ShieldAlert } from "lucide-react";
import { ModernTatreezAccent } from "@/components/ui/ModernTatreezAccent";

function getGreeting(locale) {
  const hour = new Date().getHours();
  if (locale === "ar") {
    if (hour < 12) return "صباح الخير";
    if (hour < 18) return "مساء الخير";
    return "طاب مساؤك";
  }
  if (hour < 12) return "Good Morning";
  if (hour < 18) return "Good Afternoon";
  return "Good Evening";
}

export default function DashboardPage() {
  const t = useTranslations("Dashboard");
  const navT = useTranslations("Navigation");
  const { user: authUser } = useAuth();
  const { unreadCount } = useRealtimeNotifications(authUser?.id);
  const locale = useLocale();

  const [loading, setLoading] = useState(true);
  const [profile, setProfile] = useState(null);
  const [wallet, setWallet] = useState({ balance: 0 });
  const [recentActivity, setRecentActivity] = useState([]);

  useEffect(() => {
    async function loadDashboardData() {
      if (!authUser?.id) return;
      setLoading(true);
      const [p, w, trans] = await Promise.all([
        getCurrentProfile(),
        getWallet(authUser.id),
        getTransactions(authUser.id, 5),
      ]);
      setProfile(p);
      setWallet(w);
      setRecentActivity(trans || []);
      setLoading(false);
    }
    loadDashboardData();
  }, [authUser?.id]);

  if (loading) {
    return (
      <div className="bg-background px-4 py-10">
        <div className="mx-auto flex max-w-5xl flex-col gap-6">
          <CardSkeleton />
          <div className="grid grid-cols-1 gap-5 md:grid-cols-2">
            <WalletSkeleton />
            <HeroSkeleton />
          </div>
        </div>
      </div>
    );
  }

  const isPending = profile?.status === "pending" || !profile?.is_verified;
  const isFullyActive = profile?.status === "active" && profile?.is_verified;

  const notifyRestricted = () => {
    toast.error(t("restricted_service"));
  };

  const shortcuts = [
    { href: "/services/border", label: t("shortcut_border") },
    { href: "/services/driving-license", label: t("shortcut_licence") },
    { href: "/services/education", label: t("shortcut_tawjihi") },
    { href: "/services/hospitals", label: t("shortcut_clinic") },
  ];

  const rows = recentActivity.map((item) => {
    const raw = String(item.status || "completed").toLowerCase();
    const status = raw.includes("reject") || raw === "failed" ? "rejected" : raw.includes("pend") ? "pending" : "resolved";
    const label = status === "rejected" ? t("status_rejected") : status === "pending" ? t("status_progress") : t("status_done");
    return {
      id: item.id,
      ref: item.reference_code || String(item.id || "").slice(0, 8),
      service: item.description,
      date: item.created_at ? new Date(item.created_at).toLocaleDateString(locale === "ar" ? "ar-EG" : "en-GB") : "—",
      amount: `${Number(item.amount || 0).toLocaleString("en-GB", { minimumFractionDigits: 2 })} ILS`,
      status: <StatusTag status={status}>{label}</StatusTag>,
    };
  });

  const balance = Number(wallet?.balance || 0).toLocaleString("en-GB", { minimumFractionDigits: 2 });

  return (
    <div className="bg-background px-4 py-8 sm:px-6">
      <div className="mx-auto flex max-w-5xl flex-col gap-6">
        <div className="flex flex-wrap items-end justify-between gap-3">
          <div>
            <h1 className="text-2xl font-bold text-foreground">
              {getGreeting(locale)}، {profile?.full_name?.split(" ")[0]}
            </h1>
            <p className="mt-1 text-sm text-muted-foreground">{t("subtitle")}</p>
          </div>
          <form action={signOutCitizen}>
            <Button type="submit" variant="outline" className="gap-2 rounded-sm">
              <LogOut className="h-4 w-4" />
              {navT("logout")}
            </Button>
          </form>
        </div>

        <SmartIDCard
          fullName={profile?.full_name}
          nationalId={profile?.national_id}
          photoUrl={profile?.avatar_url}
          verified={isFullyActive}
          statusLabel={isFullyActive ? t("status_active") : t("status_pending")}
          locale={locale}
        />

        <ModernTatreezAccent variant="ribbon" className="opacity-15 dark:opacity-5" />

        {isPending ? (
          <div className="flex gap-3 rounded-lg border border-warning/40 bg-warning/10 p-4">
            <ShieldAlert className="mt-0.5 h-5 w-5 shrink-0 text-warning" aria-hidden />
            <p className="text-sm font-semibold text-foreground">{t("pending_banner_body")}</p>
          </div>
        ) : null}

        <section className="rounded-lg border border-border bg-card p-4">
          <p className="text-sm text-muted-foreground">{t("wallet_balance")}</p>
          <p className="mt-1 text-3xl font-bold tabular-nums text-foreground">{balance} ILS</p>
          <div className="mt-4 flex flex-wrap gap-2">
            <a href="#statement" className="inline-flex h-9 items-center rounded-sm border border-border px-3 text-sm font-semibold text-foreground">
              {t("history")}
            </a>
            {isFullyActive ? (
              <Link href="/services/bills" className="inline-flex h-9 items-center rounded-sm bg-primary px-3 text-sm font-semibold text-primary-foreground">
                {t("pay_bill")}
              </Link>
            ) : (
              <button type="button" onClick={notifyRestricted} className="inline-flex h-9 items-center rounded-sm border border-border px-3 text-sm font-semibold text-foreground">
                {t("pay_bill")}
              </button>
            )}
          </div>
          {unreadCount > 0 ? (
            <p className="mt-3 text-xs text-muted-foreground">{navT("notifications")}: {unreadCount}</p>
          ) : null}
        </section>

        <section>
          <h2 className="mb-3 text-base font-bold text-foreground">{t("quick_actions")}</h2>
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
            {shortcuts.map((item) => (
              <Link key={item.href} href={item.href} className="rounded-lg border border-border bg-card p-4 text-sm font-semibold text-foreground hover:bg-muted">
                {item.label}
              </Link>
            ))}
          </div>
        </section>

        <section id="statement">
          <h2 className="mb-3 text-base font-bold text-foreground">{t("recent_activity")}</h2>
          <DataTable
            caption={t("recent_activity")}
            empty={navT("no_notifs")}
            columns={[
              { key: "ref", header: t("col_ref") },
              { key: "service", header: t("col_service") },
              { key: "date", header: t("col_date") },
              { key: "amount", header: t("col_amount"), numeric: true },
              { key: "status", header: t("col_status") },
            ]}
            rows={rows}
          />
        </section>
      </div>
    </div>
  );
}
