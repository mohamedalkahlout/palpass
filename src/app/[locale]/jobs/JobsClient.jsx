"use client";

import { useMemo, useState } from "react";
import { useTranslations } from "next-intl";
import Image from "next/image";
import { civicImageSrc } from "@/lib/images/civic-image";
import { Link } from "@/i18n/routing";
import { FadeIn } from "@/components/animations/FadeIn";
import {
  Briefcase,
  Search,
  Building,
  MapPin,
  Send,
  ExternalLink,
  Loader2,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { applyForJob } from "@/app/actions";
import { useAuthModal } from "@/context/AuthModalContext";
import { AtsCvDocument } from "@/components/cv/AtsCvDocument";
import { toast } from "sonner";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

export function JobsClient({ initialJobs = [], profile = null, appliedJobIds = [], activeCv = null, locale = "ar" }) {
  const t = useTranslations("Services");
  const ts = useTranslations("SuperApp");
  const commonT = useTranslations("Common");

  const [search, setSearch] = useState("");
  const [filterType, setFilterType] = useState("All");
  const [applyJob, setApplyJob] = useState(null);
  const [coverLetter, setCoverLetter] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [appliedIds, setAppliedIds] = useState(() => new Set(appliedJobIds));
  const [previewCv, setPreviewCv] = useState(false);
  const { requireAuth } = useAuthModal();

  const jobTypes = ["All", "Government", "Private"];

  const items = useMemo(() => {
    const needle = search.trim().toLowerCase();
    return initialJobs
      .filter((job) => {
        if (filterType !== "All" && String(job.type || "").toLowerCase() !== filterType.toLowerCase()) {
          return false;
        }
        if (!needle) return true;
        return (
          String(job.title || "").toLowerCase().includes(needle) ||
          String(job.organization || "").toLowerCase().includes(needle)
        );
      })
      .map((job) => ({
        ...job,
        image: civicImageSrc(job.image_url),
        postedAt: job.created_at
          ? new Date(job.created_at).toLocaleDateString(locale === "ar" ? "ar-PS" : "en-GB")
          : "",
      }));
  }, [initialJobs, search, filterType, locale]);

  const handleApply = async () => {
    if (!applyJob) return;
    setSubmitting(true);
    const result = await applyForJob(applyJob.id, coverLetter);
    if (result.success) {
      toast.success(t("apply_success"));
      setAppliedIds((prev) => new Set(prev).add(applyJob.id));
      setApplyJob(null);
      setCoverLetter("");
    } else {
      const err = result.error || ts("failed");
      if (
        String(err).toLowerCase().includes("auth") ||
        String(err).includes("تسجيل") ||
        String(err).includes("دخول")
      ) {
        toast.error(ts("login_required"));
      } else {
        toast.error(err);
      }
    }
    setSubmitting(false);
  };

  return (
    <div className="overflow-x-clip bg-background py-16 px-4 sm:px-6 lg:px-8">
      <div className="mx-auto max-w-7xl">
        <FadeIn>
          <div className="mb-12 flex flex-col items-start justify-between gap-6 lg:flex-row lg:items-end">
            <div>
              <div className="mb-4 inline-flex items-center rounded-full border border-primary/20 bg-primary/10 px-3 py-1 text-sm font-semibold text-primary">
                <Briefcase className="me-2 h-4 w-4" />
                {t("jobs")}
              </div>
              <h1 className="mb-4 text-4xl font-bold tracking-tight text-foreground md:text-5xl">
                {t("jobs")}
              </h1>
              <p className="max-w-2xl text-lg font-medium leading-relaxed text-muted-foreground">
                {t("jobs_desc")}
              </p>
              {profile?.full_name ? (
                <p className="mt-3 text-sm font-semibold text-foreground">{profile.full_name}</p>
              ) : null}
            </div>

            <Link href="/profile/cv">
              <Button className="group flex w-full cursor-pointer items-center gap-2 rounded-lg px-6 py-6 font-semibold sm:w-auto">
                <ExternalLink className="h-5 w-5 transition-transform group-hover:scale-110" />
                {t("upload_cv")}
              </Button>
            </Link>
          </div>
        </FadeIn>

        <FadeIn delay={0.1}>
          <div className="mb-10 flex flex-col items-center justify-between gap-4 rounded-lg border border-border bg-card p-4 md:flex-row">
            <div className="relative w-full md:w-96">
              <div className="pointer-events-none absolute inset-y-0 start-0 flex items-center ps-4">
                <Search className="h-5 w-5 text-muted-foreground" />
              </div>
              <input
                type="text"
                placeholder={commonT("search")}
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="block w-full rounded-lg border border-border bg-muted py-3 ps-11 pe-4 font-medium text-foreground transition-all focus:border-primary focus:ring-1 focus:ring-primary"
              />
            </div>

            <div className="flex w-full gap-2 overflow-x-auto pb-2 md:w-auto md:pb-0">
              {jobTypes.map((type) => (
                <button
                  key={type}
                  type="button"
                  onClick={() => setFilterType(type)}
                  className={`cursor-pointer whitespace-nowrap rounded-lg px-5 py-2.5 text-sm font-bold transition-all ${
                    filterType === type
                      ? "border border-transparent bg-foreground text-background"
                      : "border border-border bg-muted text-foreground hover:bg-accent"
                  }`}
                >
                  {type === "All" ? commonT("all") : type}
                </button>
              ))}
            </div>
          </div>
        </FadeIn>

        <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
          {items.length > 0 ? (
            items.map((job, index) => {
              const already = appliedIds.has(job.id);
              return (
                <FadeIn key={job.id} delay={0.1 + index * 0.05} fullWidth>
                  <div className="group relative flex h-full flex-col overflow-hidden rounded-lg border border-border bg-card text-card-foreground transition-all duration-500 md:flex-row">
                    <div className="relative h-48 w-full shrink-0 overflow-hidden md:h-auto md:w-1/3">
                      {job.image ? (
                        <Image
                          src={job.image}
                          alt={job.title}
                          fill
                          className="object-cover transition-transform duration-700 group-hover:scale-110"
                        />
                      ) : (
                        <div className="absolute inset-0 bg-[color:var(--brand-900)]" />
                      )}
                    </div>

                    <div className="flex flex-1 flex-col p-6">
                      <div className="mb-2 flex items-start justify-between gap-3">
                        <span
                          className={`rounded-full px-2.5 py-1 text-[10px] font-bold uppercase tracking-widest ${
                            job.type === "government"
                              ? "bg-primary/20 text-primary"
                              : "bg-blue-500/20 text-blue-700 dark:text-blue-300"
                          }`}
                        >
                          {t("job_sector", { type: job.type })}
                        </span>
                        <span className="text-xs font-medium text-muted-foreground">{job.postedAt}</span>
                      </div>

                      <h3 className="mb-1 text-xl font-bold text-foreground transition-colors group-hover:text-primary">
                        {job.title}
                      </h3>

                      <div className="mb-3 flex flex-wrap items-center text-sm font-medium text-muted-foreground">
                        <Building className="me-1 h-4 w-4 shrink-0 text-primary" />
                        {job.organization}
                        <span className="mx-2 text-border">•</span>
                        <MapPin className="me-1 h-4 w-4 shrink-0" />
                        {job.location}
                      </div>

                      <p className="mb-4 line-clamp-2 text-sm leading-relaxed text-muted-foreground">
                        {job.description}
                      </p>

                      <div className="mt-auto flex items-center justify-between gap-3 border-t border-border pt-4">
                        <span className="rounded-xl bg-muted px-3 py-1.5 text-sm font-semibold text-foreground">
                          {job.salary}
                        </span>
                        <Button
                          size="sm"
                          disabled={already}
                          onClick={() => requireAuth(() => {
                            setApplyJob(job);
                            setCoverLetter("");
                          })}
                          className="cursor-pointer gap-2 rounded-full px-5 text-xs font-semibold shadow-md"
                        >
                          {already ? t("applied") : t("apply")}
                          {!already ? <Send className="h-3.5 w-3.5" /> : null}
                        </Button>
                      </div>
                    </div>
                  </div>
                </FadeIn>
              );
            })
          ) : (
            <div className="col-span-full mt-8 rounded-lg border border-dashed border-border bg-card py-20 text-center">
              <Briefcase className="mx-auto mb-4 h-16 w-16 text-muted-foreground/40" />
              <p className="text-xl font-bold text-foreground">{commonT("no_results")}</p>
            </div>
          )}
        </div>
      </div>

      <Dialog open={!!applyJob} onOpenChange={(open) => !open && setApplyJob(null)}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>{t("apply_title")}</DialogTitle>
            <DialogDescription>
              {applyJob?.title} — {applyJob?.organization}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-3">
            {activeCv ? (
              <div className="flex flex-wrap items-center justify-between gap-2 rounded-lg border border-emerald-900/30 bg-emerald-900/5 px-3 py-2 text-sm font-semibold">
                <span>{t("cv_attached", { template: activeCv.template_type })}</span>
                <Button type="button" variant="outline" size="sm" className="rounded-full" onClick={() => setPreviewCv(true)}>
                  {t("preview_cv")}
                </Button>
              </div>
            ) : (
              <p className="text-sm text-muted-foreground">{t("cv_missing")}</p>
            )}
            <label className="block text-sm font-semibold text-foreground">{t("cover_letter")}</label>
            <textarea
              value={coverLetter}
              onChange={(e) => setCoverLetter(e.target.value)}
              rows={5}
              placeholder={t("cover_letter_ph")}
              className="w-full rounded-xl border border-input bg-card px-4 py-3 text-card-foreground"
            />
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setApplyJob(null)}>
              {ts("cancel")}
            </Button>
            <Button onClick={handleApply} disabled={submitting} className="font-bold">
              {submitting ? (
                <>
                  <Loader2 className="me-2 h-4 w-4 animate-spin" />
                  {t("applying")}
                </>
              ) : (
                t("apply")
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
      <Dialog open={previewCv} onOpenChange={setPreviewCv}>
        <DialogContent className="max-h-[80vh] overflow-y-auto sm:max-w-3xl">
          <AtsCvDocument cv={activeCv} />
        </DialogContent>
      </Dialog>
    </div>
  );
}
