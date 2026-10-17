"use client";

import { useState, useEffect } from "react";
import { useTranslations, useLocale } from "next-intl";
import Image from "next/image";
import { civicImageSrc } from "@/lib/images/civic-image";
import { FadeIn } from "@/components/animations/FadeIn";
import {
  ShieldCheck,
  Users,
  FileCheck2,
  Activity,
  Send,
  MapPin,
  CheckCircle,
  Search,
  X,
  ExternalLink,
  Loader2,
  IdCard,
  ScanFace,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { createClient } from "@/lib/supabase/client";
import {
  approveUser,
  rejectUser,
  approveEntity,
  getCitizenVerificationMedia,
} from "@/app/actions";
import { TableRowSkeleton } from "@/components/ui/Skeleton";
import { OfficialCrest } from "@/components/brand/BrandMark";

export default function AdminDashboardPage() {
  const t = useTranslations("Admin");
  const locale = useLocale();
  const isAr = locale === "ar";

  const [activeTab, setActiveTab] = useState("users");
  const [loading, setLoading] = useState(true);
  const [items, setItems] = useState([]);
  const [counts, setCounts] = useState({ users: 0, businesses: 0, jobs: 0 });

  const [inspectOpen, setInspectOpen] = useState(false);
  const [inspectLoading, setInspectLoading] = useState(false);
  const [inspectTarget, setInspectTarget] = useState(null);
  const [media, setMedia] = useState(null);
  const [actionPending, setActionPending] = useState(false);

  useEffect(() => {
    let cancelled = false;

    async function load() {
      await Promise.resolve();
      if (cancelled) return;
      setLoading(true);
      const supabase = createClient();

      const [{ count: uCount }, { count: bCount }, { count: jCount }] = await Promise.all([
        supabase.from("profiles").select("*", { count: "exact", head: true }).eq("status", "pending"),
        supabase.from("restaurants").select("*", { count: "exact", head: true }).eq("status", "pending"),
        supabase.from("job_postings").select("*", { count: "exact", head: true }).eq("status", "pending"),
      ]);
      if (cancelled) return;
      setCounts({ users: uCount || 0, businesses: bCount || 0, jobs: jCount || 0 });

      let data = [];
      if (activeTab === "users") {
        const { data: users } = await supabase
          .from("profiles")
          .select("*")
          .eq("status", "pending")
          .order("created_at");
        data = users || [];
      } else if (activeTab === "businesses") {
        const { data: rests } = await supabase
          .from("restaurants")
          .select("*")
          .eq("status", "pending")
          .order("created_at");
        data = rests || [];
      } else if (activeTab === "jobs") {
        const { data: jobs } = await supabase
          .from("job_postings")
          .select("*")
          .eq("status", "pending")
          .order("created_at");
        data = jobs || [];
      }
      if (cancelled) return;
      setItems(data);
      setLoading(false);
    }

    void load();
    return () => {
      cancelled = true;
    };
  }, [activeTab]);

  const closeInspect = () => {
    setInspectOpen(false);
    setInspectTarget(null);
    setMedia(null);
  };

  const openInspect = async (citizen) => {
    setInspectTarget(citizen);
    setInspectOpen(true);
    setInspectLoading(true);
    setMedia(null);
    const res = await getCitizenVerificationMedia(citizen.id);
    if (!res?.error) {
      setMedia(res);
    } else {
      setMedia({ error: res.error });
    }
    setInspectLoading(false);
  };

  const handleApproveUser = async (id) => {
    setActionPending(true);
    const res = await approveUser(id);
    setActionPending(false);
    if (!res.error) {
      setItems((prev) => prev.filter((item) => item.id !== id));
      setCounts((c) => ({ ...c, users: Math.max(0, c.users - 1) }));
      closeInspect();
    }
  };

  const handleRejectUser = async (id) => {
    setActionPending(true);
    const res = await rejectUser(
      id,
      isAr
        ? "تعذر مطابقة ملامح الوجه مع وثيقة الهوية. يرجى إعادة التقديم بوثائق أوضح."
        : "Face could not be matched to the identity document. Please resubmit clearer materials."
    );
    setActionPending(false);
    if (!res.error) {
      setItems((prev) => prev.filter((item) => item.id !== id));
      setCounts((c) => ({ ...c, users: Math.max(0, c.users - 1) }));
      closeInspect();
    }
  };

  const handleApproveEntity = async (table, id) => {
    const res = await approveEntity(table, id);
    if (!res.error) {
      setItems((prev) => prev.filter((item) => item.id !== id));
      const key = table === "restaurants" ? "businesses" : "jobs";
      setCounts((c) => ({ ...c, [key]: Math.max(0, c[key] - 1) }));
    }
  };

  return (
    <div className="bg-background py-10 px-4 sm:px-6 lg:px-8">
      <div className="max-w-7xl mx-auto flex flex-col md:flex-row gap-8 text-left rtl:text-right">
        <div className="w-full md:w-64 shrink-0 flex flex-col gap-2">
          <FadeIn>
            <h2 className="text-xl font-bold tracking-tight text-foreground px-4 mb-4">{t("title")}</h2>
            {[
              { id: "users", icon: Users, label: t("users"), count: counts.users },
              { id: "businesses", icon: FileCheck2, label: t("businesses"), count: counts.businesses },
              { id: "jobs", icon: Activity, label: t("jobs"), count: counts.jobs },
              { id: "notifications", icon: Send, label: t("notifications"), count: 0 },
            ].map((tab) => (
              <button
                key={tab.id}
                type="button"
                onClick={() => setActiveTab(tab.id)}
                className={`w-full text-left rtl:text-right px-5 py-3 rounded-lg font-semibold text-sm transition-all flex items-center justify-between cursor-pointer ${
                  activeTab === tab.id
                    ? "bg-primary text-primary-foreground"
                    : "text-muted-foreground hover:bg-muted hover:text-foreground"
                }`}
              >
                <span className="flex items-center gap-2">
                  <tab.icon className="w-4 h-4" />
                  {tab.label}
                </span>
                {tab.count > 0 && (
                  <span
                    className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                      activeTab === tab.id ? "bg-white text-primary" : "bg-primary/20 text-primary"
                    }`}
                  >
                    {tab.count}
                  </span>
                )}
              </button>
            ))}
          </FadeIn>
        </div>

        <div className="flex-1">
          <FadeIn>
            <div className="rounded-lg border border-border bg-card p-6 md:p-8 min-h-[500px]">
              <div className="flex justify-between items-center mb-8 border-b border-border pb-4">
                <h3 className="text-2xl font-bold text-foreground flex items-center gap-2">
                  <ShieldCheck className="w-6 h-6 text-primary" />
                  {activeTab === "users"
                    ? t("pending_identities")
                    : activeTab === "businesses"
                      ? t("pending_restaurants")
                      : t("pending_postings")}
                </h3>
              </div>

              {loading ? (
                <TableRowSkeleton rows={5} />
              ) : items.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-20 text-muted-foreground text-center">
                  <CheckCircle className="w-12 h-12 text-green-500/30 mb-4" />
                  <p className="text-lg font-bold text-foreground">{t("no_pending")}</p>
                  <p className="text-sm">{t("no_pending_desc", { tab: activeTab })}</p>
                </div>
              ) : (
                <div className="grid gap-3 w-full">
                  {items.map((item) => (
                    <div
                      key={item.id}
                      className="flex flex-col sm:flex-row items-center justify-between p-4 rounded-lg border border-border bg-muted gap-4 group hover:border-primary/20 transition-colors"
                    >
                      <div className="flex items-center gap-4 w-full sm:w-auto text-left rtl:text-right">
                        <div className="relative w-12 h-12 rounded-lg overflow-hidden shrink-0">
                          {civicImageSrc(item.avatar_url || item.logo_url || item.image_url) ? (
                            <Image
                              src={civicImageSrc(item.avatar_url || item.logo_url || item.image_url)}
                              alt=""
                              fill
                              className="object-cover"
                            />
                          ) : (
                            <div className="absolute inset-0 bg-[color:var(--brand-900)]" />
                          )}
                        </div>
                        <div className="flex-1 min-w-0">
                          <h4 className="font-bold text-foreground text-sm truncate">
                            {item.full_name || item.name || item.title}
                          </h4>
                          <p className="text-xs text-muted-foreground font-mono mt-0.5 truncate flex items-center gap-1">
                            {item.national_id ? `ID: ${item.national_id}` : item.city || item.organization}
                            &middot; <MapPin className="w-3 h-3" /> {item.city || item.location || item.governorate}
                          </p>
                        </div>
                      </div>

                      <div className="flex gap-2 w-full sm:w-auto shrink-0 font-bold">
                        {activeTab === "users" ? (
                          <Button
                            onClick={() => openInspect(item)}
                            className="flex-1 sm:flex-none rounded-xl h-9 text-xs px-5 cursor-pointer gap-1.5"
                          >
                            <Search className="w-3.5 h-3.5" />
                            {t("inspect_match")}
                          </Button>
                        ) : (
                          <>
                            <Button
                              onClick={() =>
                                handleApproveEntity(
                                  activeTab === "businesses" ? "restaurants" : "job_postings",
                                  item.id
                                )
                              }
                              className="flex-1 sm:flex-none rounded-xl bg-green-600 hover:bg-green-700 text-white shadow-sm h-9 text-xs px-5 cursor-pointer"
                            >
                              {t("approve")}
                            </Button>
                            <Button
                              variant="outline"
                              className="flex-1 sm:flex-none rounded-xl border-red-200 text-red-600 hover:bg-red-50 dark:border-red-900/40 dark:text-red-400 dark:hover:bg-red-900/20 h-9 text-xs px-5 cursor-pointer"
                            >
                              {t("reject")}
                            </Button>
                          </>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </FadeIn>
        </div>
      </div>

      {/* Side-by-side visual matching inspector */}
      {inspectOpen ? (
        <div className="fixed inset-0 z-[90] flex items-center justify-center p-4 bg-black/60">
          <div
            role="dialog"
            aria-modal="true"
            className="relative w-full max-w-5xl max-h-[92vh] overflow-y-auto rounded-lg border border-border bg-card text-card-foreground"
          >
            <div className="sticky top-0 z-10 flex items-center justify-between gap-3 border-b border-border bg-card px-5 py-4">
              <div className="min-w-0 text-start">
                <p className="text-xs font-bold tracking-wide text-primary">
                  {t("inspect_title")}
                </p>
                <h3 className="truncate text-lg font-black text-foreground">
                  {inspectTarget?.full_name}
                  {inspectTarget?.national_id ? (
                    <span className="ms-2 font-mono text-sm font-semibold text-muted-foreground">
                      #{inspectTarget.national_id}
                    </span>
                  ) : null}
                </h3>
              </div>
              <button
                type="button"
                onClick={closeInspect}
                className="rounded-xl p-2 hover:bg-muted"
                aria-label={t("close")}
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <div className="p-5 sm:p-6">
              {inspectLoading ? (
                <div className="flex flex-col items-center justify-center py-24 text-muted-foreground gap-3">
                  <Loader2 className="h-8 w-8 animate-spin text-primary" />
                  <p className="text-sm font-semibold">
                    {t("decrypting")}
                  </p>
                </div>
              ) : media?.error ? (
                <p className="py-16 text-center text-sm font-bold text-red-600">{media.error}</p>
              ) : (
                <>
                  <div className="relative grid grid-cols-1 gap-4 lg:grid-cols-[1fr_auto_1fr] lg:items-stretch">
                    {/* RTL: document on the right (first in DOM for RTL), face on the left */}
                    <article className="rounded-lg border border-border bg-background p-4 flex flex-col">
                      <div className="mb-3 flex items-center gap-2 text-sm font-bold text-foreground">
                        <IdCard className="h-4 w-4 text-primary" />
                        {t("id_document")}
                      </div>
                      <div className="relative flex min-h-[280px] flex-1 items-center justify-center overflow-hidden rounded-xl border border-dashed border-border bg-muted/40">
                        {media?.documentUrl ? (
                          media.isPdfDocument ? (
                            <a
                              href={media.documentUrl}
                              target="_blank"
                              rel="noreferrer"
                              className="inline-flex items-center gap-2 text-sm font-bold text-primary hover:underline"
                            >
                              <ExternalLink className="h-4 w-4" />
                              {t("open_pdf")}
                            </a>
                          ) : (
                            // eslint-disable-next-line @next/next/no-img-element
                            <img
                              src={media.documentUrl}
                              alt=""
                              className="max-h-[420px] w-full object-contain"
                            />
                          )
                        ) : (
                          <p className="text-xs text-muted-foreground">
                            {t("no_document")}
                          </p>
                        )}
                      </div>
                      {media?.documentUrl ? (
                        <a
                          href={media.documentUrl}
                          target="_blank"
                          rel="noreferrer"
                          className="mt-3 inline-flex items-center gap-1.5 text-xs font-semibold text-primary hover:underline"
                        >
                          <ExternalLink className="h-3.5 w-3.5" />
                          {t("zoom")}
                        </a>
                      ) : null}
                    </article>

                    <div className="hidden lg:flex flex-col items-center justify-center px-2 gap-2">
                      <OfficialCrest size={48} />
                      <span className="max-w-[7.5rem] text-center text-[10px] font-bold leading-snug text-primary">
                        {isAr
                          ? "محطة المطابقة العينية لملامح المواطن"
                          : "Visual face-matching station"}
                      </span>
                    </div>

                    <article className="rounded-lg border border-border bg-background p-4 flex flex-col">
                      <div className="mb-3 flex items-center gap-2 text-sm font-bold text-foreground">
                        <ScanFace className="h-4 w-4 text-primary" />
                        {t("face_photo")}
                      </div>
                      <div className="relative flex min-h-[280px] flex-1 items-center justify-center overflow-hidden rounded-xl border border-dashed border-border bg-muted/40">
                        {media?.personalPhotoUrl ? (
                          // eslint-disable-next-line @next/next/no-img-element
                          <img
                            src={media.personalPhotoUrl}
                            alt=""
                            className="max-h-[420px] w-full object-contain"
                          />
                        ) : (
                          <p className="text-xs text-muted-foreground">
                            {t("no_photo")}
                          </p>
                        )}
                      </div>
                      {media?.personalPhotoUrl ? (
                        <a
                          href={media.personalPhotoUrl}
                          target="_blank"
                          rel="noreferrer"
                          className="mt-3 inline-flex items-center gap-1.5 text-xs font-semibold text-primary hover:underline"
                        >
                          <ExternalLink className="h-3.5 w-3.5" />
                          {t("zoom")}
                        </a>
                      ) : null}
                    </article>
                  </div>

                  <div className="mt-6 flex flex-col-reverse sm:flex-row gap-3 sm:justify-end border-t border-border pt-5">
                    <Button
                      variant="outline"
                      disabled={actionPending}
                      onClick={() => handleRejectUser(inspectTarget.id)}
                      className="rounded-xl border-red-200 text-red-600 hover:bg-red-50 dark:border-red-900/40 dark:text-red-400 dark:hover:bg-red-900/20 font-bold"
                    >
                      {actionPending ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
                      {t("reject_request")}
                    </Button>
                    <Button
                      disabled={actionPending}
                      onClick={() => handleApproveUser(inspectTarget.id)}
                      className="rounded-xl bg-green-600 hover:bg-green-700 text-white font-bold gap-2"
                    >
                      {actionPending ? <Loader2 className="h-4 w-4 animate-spin" /> : <CheckCircle className="h-4 w-4" />}
                      {t("approve_match")}
                    </Button>
                  </div>
                </>
              )}
            </div>
          </div>
        </div>
      ) : null}
    </div>
  );
}
