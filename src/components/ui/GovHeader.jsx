"use client";

import { useEffect, useState } from "react";
import { useLocale, useTranslations } from "next-intl";
import { Link, usePathname, useRouter } from "@/i18n/routing";
import { ThemeSwitcher } from "@/components/ui/ThemeSwitcher";
import { LanguageSwitcher } from "@/components/ui/LanguageSwitcher";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/components/auth/AuthProvider";
import { useRealtimeNotifications } from "@/hooks/useRealtimeNotifications";
import { signOutCitizen } from "@/app/actions";
import { PalpassIcon, NationalEmblem } from "@/components/brand/SovereignMarks";
import { createClient } from "@/lib/supabase/client";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Bell,
  Menu,
  X,
  ChevronDown,
  LayoutDashboard,
  Utensils,
  Bus,
  Briefcase,
  Heart,
  Globe,
  Newspaper,
  LogIn,
  User,
  LogOut,
  Crown,
  Landmark,
  FileWarning,
  Building2,
  Moon,
} from "lucide-react";

/** Government services — single consolidated dropdown */
const governmentLinks = [
  { key: "passport_renewal_title", href: "/services/government", icon: Landmark },
  { key: "land_registry_title", href: "/services/government", icon: Building2 },
  { key: "hajj", href: "/services/hajj", icon: Moon },
  { key: "border", href: "/services/border", icon: Globe },
  { key: "violations", href: "/services/violations", icon: FileWarning },
  { key: "bills", href: "/services/bills", icon: LayoutDashboard },
];

/** Civic & community — single consolidated dropdown */
const civicLinks = [
  { key: "transport", href: "/transport", icon: Bus },
  { key: "restaurants", href: "/restaurants", icon: Utensils },
  { key: "jobs", href: "/jobs", icon: Briefcase },
  { key: "news", href: "/news", icon: Newspaper },
  { key: "charity", href: "/charity", icon: Heart },
];

function NavDropdown({ label, items, getLabel }) {
  const router = useRouter();

  return (
    <DropdownMenu modal={false}>
      <DropdownMenuTrigger asChild>
        <button
          type="button"
          className="inline-flex shrink-0 items-center gap-1 whitespace-nowrap rounded-lg px-2 py-1.5 text-[13px] font-semibold text-foreground/85 transition hover:bg-muted hover:text-foreground"
        >
          {label}
          <ChevronDown className="h-3.5 w-3.5 opacity-55" aria-hidden />
        </button>
      </DropdownMenuTrigger>
      <DropdownMenuContent
        align="start"
        sideOffset={10}
        className="z-[100] w-72 rounded-lg border border-border bg-card p-2 text-card-foreground"
      >
        {items.map((item) => {
          const Icon = item.icon;
          return (
            <DropdownMenuItem
              key={`${item.href}-${item.key}`}
              className="cursor-pointer gap-3 rounded-xl px-3 py-2.5 text-sm font-medium focus:bg-muted"
              onSelect={() => router.push(item.href)}
            >
              {Icon ? <Icon className="h-4 w-4 shrink-0 text-primary" /> : null}
              <span className="leading-snug">{getLabel(item)}</span>
            </DropdownMenuItem>
          );
        })}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

function SessionMenu({ t, profile, balanceLabel, onNavigate, wide = false }) {
  const router = useRouter();
  const isAdmin = profile?.role === "admin";
  const name = profile?.full_name || "—";

  return (
    <DropdownMenu modal={false}>
      <DropdownMenuTrigger asChild>
        <button
          type="button"
          className={`inline-flex shrink-0 items-center gap-2 rounded-lg border border-border bg-card px-3 py-1.5 text-start text-xs font-bold ${
            wide ? "w-full" : "max-w-[16rem]"
          }`}
        >
          <span className="relative inline-flex">
            {isAdmin ? <Crown className="h-4 w-4 shrink-0 text-[color:var(--gold-700)]" /> : <User className="h-4 w-4 shrink-0 text-primary" />}
            <span className="absolute -end-1 -top-1 h-2 w-2 rounded-full bg-[color:var(--brand-700)] ring-2 ring-card" />
          </span>
          <span className="min-w-0">
            <span className="block truncate">{name}</span>
            <span className="block truncate font-mono text-[10px] font-semibold text-muted-foreground" dir="ltr">
              {profile?.national_id || ""}
              {balanceLabel ? ` · ${balanceLabel} ILS` : ""}
            </span>
          </span>
        </button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="z-[100] w-64 rounded-lg border border-border p-2">
        <DropdownMenuItem
          className="cursor-pointer rounded-xl"
          onSelect={() => {
            onNavigate?.();
            router.push("/dashboard");
          }}
        >
          <LayoutDashboard className="me-2 h-4 w-4" />
          {t("dashboard")}
        </DropdownMenuItem>
        {isAdmin ? (
          <DropdownMenuItem
            className="cursor-pointer rounded-xl"
            onSelect={() => {
              onNavigate?.();
              router.push("/admin");
            }}
          >
            <Crown className="me-2 h-4 w-4 text-[#C5A059]" />
            {t("admin_portal")}
          </DropdownMenuItem>
        ) : null}
        <form action={signOutCitizen} className="mt-1">
          <button type="submit" className="flex w-full items-center rounded-xl px-2 py-2 text-sm font-semibold text-destructive hover:bg-muted">
            <LogOut className="me-2 h-4 w-4" />
            {t("logout")}
          </button>
        </form>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

export function GovHeader() {
  const t = useTranslations("Navigation");
  const st = useTranslations("Services");
  const commonT = useTranslations("Common");
  const locale = useLocale();
  const pathname = usePathname();
  const { user, loading: authLoading } = useAuth();
  const [profile, setProfile] = useState(null);
  const [wallet, setWallet] = useState(null);
  const [profileLoading, setProfileLoading] = useState(false);
  const [sessionUserId, setSessionUserId] = useState(null);
  const [mobileOpen, setMobileOpen] = useState(false);
  const [notifOpen, setNotifOpen] = useState(false);
  const { notifications: liveNotifs, unreadCount, markRead, markAllRead } =
    useRealtimeNotifications(user?.id);

  const closeMobile = () => setMobileOpen(false);
  const activeUserId = user?.id || null;

  if (activeUserId !== sessionUserId) {
    setSessionUserId(activeUserId);
    setProfileLoading(Boolean(activeUserId));
    if (!activeUserId) {
      setProfile(null);
      setWallet(null);
    }
  }

  useEffect(() => {
    if (!user?.id) return undefined;
    let cancelled = false;
    const supabase = createClient();
    (async () => {
      const [profileRes, walletRes] = await Promise.all([
        supabase.from("profiles").select("full_name, national_id, role").eq("id", user.id).maybeSingle(),
        supabase.from("wallets").select("balance, currency").eq("user_id", user.id).maybeSingle(),
      ]);
      if (cancelled) return;
      setProfile(profileRes.data || null);
      setWallet(walletRes.data || null);
      setProfileLoading(false);
    })();
    return () => {
      cancelled = true;
    };
  }, [user?.id]);

  useEffect(() => {
    const onWallet = async (event) => {
      const nextBalance = event.detail?.newBalance;
      if (nextBalance != null && nextBalance !== "") {
        setWallet((current) => ({
          ...(current || {}),
          balance: nextBalance,
          currency: current?.currency || "ILS",
        }));
        return;
      }
      if (!user?.id) return;
      const supabase = createClient();
      const { data } = await supabase
        .from("wallets")
        .select("balance, currency")
        .eq("user_id", user.id)
        .maybeSingle();
      if (data) setWallet(data);
    };
    window.addEventListener("palpass-wallet-updated", onWallet);
    return () => window.removeEventListener("palpass-wallet-updated", onWallet);
  }, [user?.id]);

  const balanceLabel =
    wallet?.balance == null
      ? null
      : new Intl.NumberFormat(locale === "ar" ? "ar-PS" : "en-GB", {
          minimumFractionDigits: 2,
          maximumFractionDigits: 2,
        }).format(Number(wallet.balance));

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect -- protected navbar nav-cleanup on route change (preserved)
    closeMobile();
    setNotifOpen(false);
  }, [pathname]);

  useEffect(() => {
    if (!mobileOpen) return undefined;
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = prev;
    };
  }, [mobileOpen]);

  const loginLabel = locale === "ar" ? "دخول" : "Sign in";

  const stateLine = locale === "ar"
    ? "دولة فلسطين — الأمانة العامة لمجلس الوزراء"
    : "State of Palestine — General Secretariat of the Council of Ministers";
  const betaLine = locale === "ar"
    ? "نسخة تجريبية تشغيلية — بيئة التحقق الحكومية"
    : "Operational beta — government verification environment";

  return (
    <div className="sticky top-0 z-50 w-full">
      <p className="bg-[#064e3b] px-4 py-1 text-center text-[11px] font-semibold text-[#fafaf9]">
        {betaLine}
      </p>
      <div className="border-b border-border bg-card">
        <div className="page-wrap flex items-center gap-3 py-2">
          <NationalEmblem className="h-8 w-7 shrink-0" />
          <p className="text-xs font-semibold text-foreground sm:text-sm">{stateLine}</p>
        </div>
      </div>
    <header className="w-full overflow-visible border-b border-border bg-background text-foreground">
      <div className="page-wrap relative flex h-14 items-center gap-3 overflow-visible">
        {/* Brand */}
        <div className="relative z-10 flex min-w-0 shrink-0 items-center">
          <Link href="/" className="group inline-flex shrink-0 items-center gap-2.5" aria-label="PALPASS">
            <PalpassIcon className="h-10 w-10 transition-transform duration-300 group-hover:scale-105" />
            <span className="hidden text-sm font-black tracking-tight leading-tight sm:inline">
              PALPASS
              <span className="block text-[10px] font-semibold text-muted-foreground">
                {locale === "ar" ? "منظومة الهوية الرقمية الموحدة" : "Unified Digital Identity System"}
              </span>
            </span>
          </Link>
        </div>

        {/* Desktop nav — single horizontal line from xl up */}
        <nav
          className="relative z-10 mx-auto hidden min-w-0 flex-1 items-center justify-center gap-1 overflow-visible min-[1180px]:flex xl:gap-2"
          aria-label={t("home")}
        >
          <Link
            href="/"
            className={`relative shrink-0 whitespace-nowrap rounded-lg px-2 py-1.5 text-[13px] font-semibold after:absolute after:inset-x-2 after:bottom-0 after:h-0.5 after:origin-center after:rounded-full after:bg-[#064e3b] after:transition-transform after:duration-300 ${
              pathname === "/"
                ? "text-primary after:scale-x-100"
                : "text-foreground/85 after:scale-x-0 hover:bg-muted hover:text-foreground hover:after:scale-x-100"
            }`}
          >
            {t("home")}
          </Link>

          <NavDropdown
            label={t("services")}
            items={governmentLinks}
            getLabel={(item) => st(item.key)}
          />

          <NavDropdown
            label={t("civic")}
            items={civicLinks}
            getLabel={(item) => t(item.key)}
          />

          <Link
            href="/about"
            className={`relative shrink-0 whitespace-nowrap rounded-lg px-2 py-1.5 text-[13px] font-semibold after:absolute after:inset-x-2 after:bottom-0 after:h-0.5 after:origin-center after:rounded-full after:bg-[#064e3b] after:transition-transform after:duration-300 ${
              pathname === "/about"
                ? "text-primary after:scale-x-100"
                : "text-foreground/85 after:scale-x-0 hover:bg-muted hover:text-foreground hover:after:scale-x-100"
            }`}
          >
            {t("about")}
          </Link>
        </nav>

        {/* Actions */}
        <div className="relative z-10 ms-auto flex shrink-0 items-center gap-1 sm:gap-1.5">
          <div className="relative">
            <button
              type="button"
              onClick={() => setNotifOpen((v) => !v)}
              className="relative rounded-xl p-2 hover:bg-muted"
              aria-label={t("notifications")}
              aria-expanded={notifOpen}
            >
              <Bell className="h-5 w-5 text-foreground" />
              {unreadCount > 0 ? (
                <span className="absolute top-1.5 end-1.5 h-2 w-2 animate-pulse rounded-full border border-background bg-red-500" />
              ) : null}
            </button>
            {notifOpen ? (
              <div className="absolute top-full z-[100] mt-2 w-[min(20rem,calc(100vw-2rem))] rounded-lg border border-border bg-card p-4 text-card-foreground end-0">
                <div className="mb-3 flex items-center justify-between gap-2 text-start">
                  <h4 className="text-sm font-bold text-foreground">{t("notifications")}</h4>
                  {unreadCount > 0 ? (
                    <button
                      type="button"
                      onClick={markAllRead}
                      className="text-xs font-semibold text-primary hover:underline"
                    >
                      {t("mark_all_read")}
                    </button>
                  ) : null}
                </div>
                <div className="scrollbar-hide max-h-72 space-y-2 overflow-y-auto text-start">
                  {liveNotifs.length === 0 ? (
                    <p className="py-6 text-center text-xs text-muted-foreground">{t("no_notifs")}</p>
                  ) : (
                    liveNotifs.map((n) => (
                      <button
                        type="button"
                        key={n.id}
                        className={`w-full rounded-xl p-3 text-start text-sm ${
                          !n.is_read ? "border border-primary/10 bg-primary/5" : "hover:bg-muted"
                        }`}
                        onClick={() => markRead(n.id)}
                      >
                        <p className="font-semibold text-foreground">{n.title}</p>
                        <p className="text-[11px] leading-relaxed text-muted-foreground">{n.message}</p>
                      </button>
                    ))
                  )}
                </div>
              </div>
            ) : null}
          </div>

          <LanguageSwitcher />
          <div className="hidden sm:block">
            <ThemeSwitcher />
          </div>

          <div className="hidden sm:flex">
            {authLoading || (user && profileLoading) ? (
              <span className="h-9 w-36 animate-pulse rounded-full bg-muted" aria-hidden />
            ) : user ? (
              <SessionMenu
                t={t}
                profile={profile}
                balanceLabel={balanceLabel}
                onNavigate={closeMobile}
              />
            ) : (
              <Link href="/auth/login">
                <Button className="h-9 gap-1.5 rounded-lg px-3 text-xs font-semibold xl:px-3.5">
                  <LogIn className="h-4 w-4 shrink-0" />
                  <span className="hidden 2xl:inline">{t("login")}</span>
                  <span className="2xl:hidden">{loginLabel}</span>
                </Button>
              </Link>
            )}
          </div>

          <button
            type="button"
            onClick={() => setMobileOpen((v) => !v)}
            className="rounded-xl p-2 hover:bg-muted min-[1180px]:hidden"
            aria-label={commonT("menu")}
            aria-expanded={mobileOpen}
          >
            {mobileOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
          </button>
        </div>
      </div>

      {/* Mobile / tablet drawer below xl */}
      {mobileOpen ? (
        <>
          <div
            className="fixed inset-0 z-[60] bg-black/50 min-[1180px]:hidden"
            onClick={closeMobile}
            aria-hidden
          />
          <aside
            className="fixed inset-y-0 end-0 z-[70] flex w-[min(22rem,92vw)] flex-col overflow-y-auto border-s border-border bg-card text-card-foreground min-[1180px]:hidden"
            role="dialog"
            aria-modal="true"
            aria-label={commonT("menu")}
          >
            <div className="flex items-center justify-between border-b border-border px-4 py-4">
              <PalpassIcon className="h-8 w-8" />
              <button
                type="button"
                onClick={closeMobile}
                className="rounded-xl p-2 hover:bg-muted"
                aria-label={commonT("close")}
              >
                <X className="h-5 w-5" />
              </button>
            </div>
            <nav className="flex flex-col gap-1 p-4 text-start">
              <Link
                href="/"
                onClick={closeMobile}
                className="rounded-xl px-3 py-2.5 text-sm font-medium hover:bg-muted"
              >
                {t("home")}
              </Link>

              <p className="mt-3 px-3 text-xs font-bold tracking-wide text-muted-foreground">
                {t("services")}
              </p>
              {governmentLinks.map((child) => {
                const Icon = child.icon;
                return (
                  <Link
                    key={`${child.href}-${child.key}`}
                    href={child.href}
                    onClick={closeMobile}
                    className="flex items-center gap-3 rounded-xl px-4 py-2.5 text-sm font-medium text-foreground/80 hover:bg-muted hover:text-foreground"
                  >
                    <Icon className="h-4 w-4 text-primary" />
                    {st(child.key)}
                  </Link>
                );
              })}

              <p className="mt-3 px-3 text-xs font-bold tracking-wide text-muted-foreground">
                {t("civic")}
              </p>
              {civicLinks.map((child) => {
                const Icon = child.icon;
                return (
                  <Link
                    key={child.href}
                    href={child.href}
                    onClick={closeMobile}
                    className="flex items-center gap-3 rounded-xl px-4 py-2.5 text-sm font-medium text-foreground/80 hover:bg-muted hover:text-foreground"
                  >
                    <Icon className="h-4 w-4 text-primary" />
                    {t(child.key)}
                  </Link>
                );
              })}

              <Link
                href="/about"
                onClick={closeMobile}
                className="mt-2 rounded-xl px-3 py-2.5 text-sm font-medium hover:bg-muted"
              >
                {t("about")}
              </Link>

              <div className="mt-3 flex items-center gap-2 border-t border-border pt-3 sm:hidden">
                <ThemeSwitcher />
              </div>

              <div className="mt-3 flex flex-col gap-2 border-t border-border pt-3">
                {authLoading || (user && profileLoading) ? (
                  <span className="h-10 w-full animate-pulse rounded-xl bg-muted" aria-hidden />
                ) : user ? (
                  <SessionMenu
                    t={t}
                    profile={profile}
                    balanceLabel={balanceLabel}
                    onNavigate={closeMobile}
                    wide
                  />
                ) : (
                  <Link href="/auth/login" onClick={closeMobile}>
                    <Button className="w-full rounded-xl">{t("login")}</Button>
                  </Link>
                )}
              </div>
            </nav>
          </aside>
        </>
      ) : null}
    </header>
    </div>
  );
}
