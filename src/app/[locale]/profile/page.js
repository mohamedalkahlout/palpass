"use client";

import { useState, useEffect, useRef } from "react";
import { useTranslations, useLocale } from "next-intl";
import { Link } from "@/i18n/routing";
import Image from "next/image";
import { civicImageSrc } from "@/lib/images/civic-image";
import { useAuth } from "@/components/auth/AuthProvider";
import { getCurrentProfile, getCVData, getWallet } from "@/lib/supabase/service";
import { updateProfile, uploadAvatar, addEducation, addExperience } from "@/app/actions";
import { ProfileSkeleton, CardSkeleton } from "@/components/ui/Skeleton";
import { FadeIn } from "@/components/animations/FadeIn";
import { Button } from "@/components/ui/button";
import { 
  ShieldCheck, 
  Settings, 
  Mail, 
  MapPin, 
  CreditCard, 
  ChevronRight,
  FileText,
  User,
  Plus,
  ArrowUpRight,
  TrendingUp,
  Briefcase,
  GraduationCap,
  Edit3,
  Save,
  Check,
  X,
  Lock,
  Phone
} from "lucide-react";

export default function ProfilePage() {
  const t = useTranslations("Profile");
  const commonT = useTranslations("Common");
  const { user: authUser } = useAuth();
  const locale = useLocale();

  const [loading, setLoading] = useState(true);
  const [profile, setProfile] = useState(null);
  const [cv, setCv] = useState({ education: [], experience: [] });
  const [wallet, setWalletData] = useState({ balance: 0 });
  const [editing, setEditing] = useState(false);
  const [form, setForm] = useState({});
  const [saved, setSaved] = useState(false);
  const [uploading, setUploading] = useState(false);
  
  const fileInputRef = useRef(null);

  useEffect(() => {
    async function loadData() {
      if (!authUser) return;
      setLoading(true);
      const [p, c, w] = await Promise.all([
        getCurrentProfile(),
        getCVData(authUser.id),
        getWallet(authUser.id)
      ]);
      setProfile(p);
      setForm(p || {});
      setCv(c);
      setWalletData(w);
      setLoading(false);
    }
    loadData();
  }, [authUser]);

  const handleSave = async () => {
    const formData = new FormData();
    formData.append("fullName", form.full_name);
    formData.append("phone",     form.phone);
    formData.append("city",      form.city);
    formData.append("region",    form.region);
    formData.append("cvPublic",  form.cv_public);

    const res = await updateProfile(formData);
    if (!res.error) {
      setProfile({ ...form });
      setEditing(false);
      setSaved(true);
      setTimeout(() => setSaved(false), 2000);
    }
  };

  const handleAvatarUpload = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setUploading(true);
    const formData = new FormData();
    formData.append("avatar", file);

    const res = await uploadAvatar(formData);
    if (!res.error && res.url) {
      setProfile(prev => ({ ...prev, avatar_url: res.url }));
    }
    setUploading(false);
  };

  const onAddEdu = async (e) => {
    e.preventDefault();
    const fd = new FormData(e.target);
    const res = await addEducation(fd);
    if (!res.error) {
      const updatedCv = await getCVData(authUser.id);
      setCv(updatedCv);
      e.target.reset();
    }
  };

  const onAddExp = async (e) => {
    e.preventDefault();
    const fd = new FormData(e.target);
    const res = await addExperience(fd);
    if (!res.error) {
      const updatedCv = await getCVData(authUser.id);
      setCv(updatedCv);
      e.target.reset();
    }
  };

  if (loading) {
    return (
      <div className="bg-background py-10 px-4 sm:px-6 lg:px-8">
        <div className="max-w-5xl mx-auto grid grid-cols-1 lg:grid-cols-3 gap-6">
          <ProfileSkeleton />
          <div className="lg:col-span-2 space-y-6">
            <CardSkeleton />
            <CardSkeleton />
          </div>
        </div>
      </div>
    );
  }

  if (!profile) return <div className="p-20 text-center">User profile not found.</div>;

  return (
    <div className="bg-background py-10 px-4 sm:px-6 lg:px-8">
      <div className="max-w-5xl mx-auto space-y-6">

        {/* Header Card */}
        <FadeIn>
          <div className="overflow-hidden rounded-lg border border-border bg-card">
            <div className="h-2 bg-[color:var(--brand-900)]" />

            <div className="relative px-6 pb-8 sm:px-8">
              <div className="flex flex-col sm:flex-row sm:items-end gap-4 text-start">
                <div className="relative w-28 h-28 rounded-lg overflow-hidden ring-2 ring-border bg-muted shrink-0 group">
                  {civicImageSrc(profile.avatar_url) ? (
                    <Image
                      src={civicImageSrc(profile.avatar_url)}
                      alt={profile.full_name}
                      fill
                      className={`object-cover ${uploading ? "opacity-50" : ""}`}
                    />
                  ) : (
                    <div className="absolute inset-0 bg-[color:var(--brand-900)]" />
                  )}
                  {uploading && (
                    <div className="absolute inset-0 flex items-center justify-center">
                      <div className="w-6 h-6 border-2 border-primary border-t-transparent rounded-full animate-spin" />
                    </div>
                  )}
                  <label className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center cursor-pointer">
                    <Edit3 className="w-5 h-5 text-white" />
                    <input type="file" accept="image/*" className="sr-only" onChange={handleAvatarUpload} />
                  </label>
                </div>

                <div className="flex-1 pt-4 sm:pt-8">
                  <div className="flex flex-wrap items-start gap-3 justify-between">
                    <div>
                      <h1 className="text-2xl font-bold tracking-tight text-foreground">{profile.full_name}</h1>
                      <p className="text-muted-foreground text-sm font-mono mt-0.5">{t("national_id")}: {profile.national_id}</p>
                      <div className="flex flex-wrap gap-2 mt-2">
                        <span className={`text-xs font-bold px-3 py-1 rounded-full ${profile.is_verified ? 'bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-400' : 'bg-zinc-100 dark:bg-zinc-800 text-zinc-500'}`}>
                          {profile.is_verified ? `✓ ${t("verified")}` : t("pending")}
                        </span>
                        <span className="bg-primary/10 text-primary text-xs font-bold px-3 py-1 rounded-full capitalize">
                          {profile.status}
                        </span>
                      </div>
                    </div>

                    <div className="flex gap-2">
                      {saved && (
                        <span className="flex items-center gap-1 text-green-600 text-sm font-semibold animate-in fade-in slide-in-from-right-2">
                          <Check className="w-4 h-4" /> {commonT("success")}
                        </span>
                      )}
                      {editing ? (
                        <>
                          <Button size="sm" onClick={handleSave} className="rounded-xl gap-1.5 cursor-pointer">
                            <Save className="w-4 h-4" /> {t("save_changes")}
                          </Button>
                          <Button size="sm" variant="outline" onClick={() => { setForm({ ...profile }); setEditing(false); }} className="rounded-xl gap-1.5 cursor-pointer">
                            <X className="w-4 h-4" /> {commonT("cancel")}
                          </Button>
                        </>
                      ) : (
                        <Button size="sm" onClick={() => setEditing(true)} variant="outline" className="rounded-xl gap-1.5 cursor-pointer">
                          <Edit3 className="w-4 h-4" /> {t("edit")}
                        </Button>
                      )}
                    </div>
                  </div>
                </div>
              </div>
              <dl className="mt-6 grid grid-cols-1 gap-3 text-sm sm:grid-cols-2">
                {[
                  [t("national_id"), profile.national_id],
                  [t("region"), profile.region || profile.governorate],
                  [t("city"), profile.city],
                  [t("personal_info"), profile.date_of_birth || profile.birth_date || profile.marital_status || "—"],
                ].map(([label, value]) => (
                  <div key={label} className="rounded-lg border border-border bg-background p-3">
                    <dt className="text-xs text-muted-foreground">{label}</dt>
                    <dd className="mt-1 font-semibold text-foreground">{value || "—"}</dd>
                  </div>
                ))}
              </dl>
            </div>
          </div>
        </FadeIn>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="lg:col-span-1 space-y-6">
            <FadeIn delay={0.1}>
              <div className="rounded-lg border border-border bg-card p-6">
                <h3 className="font-bold text-foreground mb-5 flex items-center gap-2 text-start">
                  <User className="w-5 h-5 text-primary" /> {t("personal_info")}
                </h3>
                <div className="space-y-4 text-sm text-start">
                  {[
                    { icon: Mail, label: t("email"), field: "email", type: "email", disabled: true },
                    { icon: Phone, label: t("phone"), field: "phone", type: "tel" },
                    { icon: MapPin, label: t("city"), field: "city", type: "text" },
                    { icon: MapPin, label: t("region"), field: "region", type: "text" },
                  ].map(({ icon: Icon, label, field, type, disabled }) => (
                    <div key={field} className="flex items-start gap-3">
                      <Icon className="w-4 h-4 text-muted-foreground mt-1 shrink-0" />
                      <div className="flex-1 min-w-0">
                        <p className="text-xs text-muted-foreground mb-1">{label}</p>
                        {editing && !disabled ? (
                          <input
                            type={type}
                            value={form[field] || ""}
                            onChange={(e) => setForm((f) => ({ ...f, [field]: e.target.value }))}
                            className="w-full bg-black/5 dark:bg-white/5 rounded-lg px-3 py-1.5 text-foreground text-sm border-transparent focus:border-primary focus:ring-1 focus:ring-primary"
                          />
                        ) : (
                          <p className="font-medium text-foreground truncate">{profile[field]}</p>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </FadeIn>

            <FadeIn delay={0.2}>
              <div className="rounded-lg border border-border bg-card p-6">
                <h3 className="font-bold text-foreground mb-4 flex items-center gap-2 text-start">
                  <Lock className="w-5 h-5 text-primary" /> {t("cv_privacy")}
                </h3>
                <div className="flex items-center justify-between text-start">
                  <div>
                    <p className="text-sm font-medium text-foreground">{t("public_cv")}</p>
                    <p className="text-xs text-muted-foreground mt-0.5">{t("public_cv_desc")}</p>
                  </div>
                  <button
                    onClick={() => setForm(f => ({ ...f, cv_public: !f.cv_public }))}
                    disabled={!editing}
                    className={`relative w-12 h-6 rounded-full transition-colors shrink-0 ${form.cv_public ? "bg-primary" : "bg-black/20 dark:bg-white/20"} ${!editing ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'}`}
                  >
                    <span className={`absolute top-1 w-4 h-4 bg-white rounded-full shadow transition-transform ${form.cv_public ? "translate-x-7 rtl:-translate-x-7" : "translate-x-1 rtl:-translate-x-1"}`} />
                  </button>
                </div>
              </div>
            </FadeIn>

            <FadeIn delay={0.3}>
              <div className="rounded-lg border border-border bg-card p-6 text-start">
                <h3 className="font-bold text-foreground mb-2 flex items-center gap-2">
                  {t("wallet")}
                </h3>
                <p className="text-3xl font-bold tabular-nums text-foreground tracking-tight mt-2">{wallet.balance.toLocaleString()}</p>
                <p className="text-xs text-muted-foreground mt-1">{t("wallet_available")}</p>
                <Button variant="outline" className="w-full mt-4 rounded-xl text-sm font-semibold border-primary/20 hover:bg-primary/5 cursor-pointer">
                  {t("top_up")}
                </Button>
              </div>
            </FadeIn>
          </div>

          <div className="lg:col-span-2 space-y-6">
            <FadeIn delay={0.2}>
              <div className="rounded-lg border border-border bg-card p-6">
                <h3 className="font-bold text-foreground mb-6 flex items-center gap-2 text-start">
                  <GraduationCap className="w-5 h-5 text-primary" /> {t("education")}
                </h3>

                <div className="space-y-4">
                  {cv.education.map((edu) => (
                    <div key={edu.id} className="flex items-start gap-4 rounded-lg border border-border bg-muted/40 p-4 text-start">
                      <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center shrink-0 mt-0.5">
                        <GraduationCap className="w-5 h-5 text-primary" />
                      </div>
                      <div className="flex-1">
                        <p className="font-bold text-foreground text-sm">{edu.degree}</p>
                        <p className="text-muted-foreground text-xs">{edu.institution}</p>
                        <p className="text-primary text-xs font-semibold mt-1">{edu.year}</p>
                      </div>
                    </div>
                  ))}
                  
                  {editing && (
                    <form onSubmit={onAddEdu} className="p-4 rounded-lg border border-dashed border-border space-y-3">
                      <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                        <input name="degree" placeholder={t("degree")} required className="bg-card text-card-foreground border border-input rounded-lg px-3 py-1.5 text-sm sm:col-span-2" />
                        <input name="year" placeholder={t("year")} required className="bg-card text-card-foreground border border-input rounded-lg px-3 py-1.5 text-sm" />
                        <input name="institution" placeholder={t("institution")} required className="bg-card text-card-foreground border border-input rounded-lg px-3 py-1.5 text-sm sm:col-span-3" />
                      </div>
                      <Button type="submit" size="sm" variant="outline" className="w-full rounded-xl gap-1 text-xs cursor-pointer">
                        <Plus className="w-3.5 h-3.5" /> {t("add_education")}
                      </Button>
                    </form>
                  )}
                </div>
              </div>
            </FadeIn>

            <FadeIn delay={0.3}>
              <div className="rounded-lg border border-border bg-card p-6">
                <h3 className="font-bold text-foreground mb-6 flex items-center gap-2 text-start">
                  <Briefcase className="w-5 h-5 text-primary" /> {t("experience")}
                </h3>

                <div className="space-y-4">
                  {cv.experience.map((exp) => (
                    <div key={exp.id} className="flex items-start gap-4 rounded-lg border border-border bg-muted/40 p-4 text-start">
                      <div className="w-10 h-10 rounded-xl bg-blue-500/10 flex items-center justify-center shrink-0 mt-0.5">
                        <Briefcase className="w-5 h-5 text-blue-600 dark:text-blue-400" />
                      </div>
                      <div className="flex-1">
                        <p className="font-bold text-foreground text-sm">{exp.title}</p>
                        <p className="text-muted-foreground text-xs">{exp.company}</p>
                        <p className="text-primary text-xs font-semibold mt-1">{exp.from_year} — {exp.to_year}</p>
                      </div>
                    </div>
                  ))}

                  {editing && (
                    <form onSubmit={onAddExp} className="p-4 rounded-lg border border-dashed border-border space-y-3">
                      <div className="grid grid-cols-2 gap-2">
                        <input name="title" placeholder={t("job_title")} required className="bg-card text-card-foreground border border-input rounded-lg px-3 py-1.5 text-sm" />
                        <input name="company" placeholder={t("company")} required className="bg-card text-card-foreground border border-input rounded-lg px-3 py-1.5 text-sm" />
                        <input name="fromYear" placeholder={t("from_year")} required className="bg-card text-card-foreground border border-input rounded-lg px-3 py-1.5 text-sm" />
                        <input name="toYear" placeholder={t("to_year")} required className="bg-card text-card-foreground border border-input rounded-lg px-3 py-1.5 text-sm" />
                      </div>
                      <Button type="submit" size="sm" variant="outline" className="w-full rounded-xl gap-1 text-xs cursor-pointer">
                        <Plus className="w-3.5 h-3.5" /> {t("add_experience")}
                      </Button>
                    </form>
                  )}
                </div>
              </div>
            </FadeIn>
          </div>
        </div>
      </div>
    </div>
  );
}
