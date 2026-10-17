"use client";

import { useState } from "react";
import { X, CheckCircle2, Store, Building, Phone } from "lucide-react";
import { Button } from "@/components/ui/button";
import { submitRestaurant } from "@/app/actions";
import { useTranslations } from "next-intl";

export function RestaurantFormModal({ isOpen, onClose }) {
  const t = useTranslations("Restaurants");
  const commonT = useTranslations("Common");
  const [submitted, setSubmitted] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  if (!isOpen) return null;

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError("");

    const formData = new FormData(e.target);
    const result = await submitRestaurant(formData);

    if (result.success) {
      setSubmitted(true);
    } else {
      setError(result.error || t("submit_failed"));
    }
    setLoading(false);
  };

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/60" onClick={onClose} />

      <div className="relative w-full max-w-lg overflow-hidden rounded-lg border border-border bg-card text-card-foreground animate-in fade-in zoom-in-95 duration-200">
        <div className="absolute top-4 right-4 rtl:left-4 rtl:right-auto z-10">
          <button
            onClick={onClose}
            aria-label={commonT("close")}
            className="p-2 bg-muted hover:bg-accent rounded-full transition-colors cursor-pointer text-foreground"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {submitted ? (
          <div className="p-10 text-center flex flex-col items-center justify-center min-h-[400px]">
            <div className="w-20 h-20 bg-green-100 dark:bg-green-900/30 rounded-full flex items-center justify-center mb-6">
              <CheckCircle2 className="w-10 h-10 text-green-600 dark:text-green-400" />
            </div>
            <h3 className="text-2xl font-bold tracking-tight text-foreground mb-2">{t("submitted_title")}</h3>
            <p className="text-muted-foreground mb-8">{t("submitted_desc")}</p>
            <Button onClick={onClose} className="rounded-full px-8">{commonT("done")}</Button>
          </div>
        ) : (
          <div className="p-6 sm:p-8">
            <div className="mb-6">
              <h2 className="text-2xl font-bold tracking-tight text-foreground mb-1">{t("add_title")}</h2>
              <p className="text-sm text-muted-foreground">{t("add_subtitle")}</p>
            </div>

            {error && (
              <div className="mb-4 p-3 bg-red-50 dark:bg-red-900/10 border border-red-100 dark:border-red-900/20 rounded-xl text-red-600 text-xs font-medium">
                {error}
              </div>
            )}

            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="text-sm font-medium mb-1 block flex items-center gap-1.5">
                  <Store className="w-4 h-4 text-primary" /> {t("name")}
                </label>
                <input
                  required
                  name="name"
                  type="text"
                  className="w-full rounded-xl bg-card text-card-foreground border border-input focus:border-primary focus:ring-1 focus:ring-primary px-4 py-2.5 text-sm"
                  placeholder={t("name_ph")}
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-sm font-medium mb-1 block flex items-center gap-1.5">
                    <Building className="w-4 h-4 text-primary" /> {t("city")}
                  </label>
                  <select
                    required
                    name="city"
                    className="w-full rounded-xl bg-popover text-popover-foreground border border-input focus:border-primary focus:ring-1 focus:ring-primary px-4 py-2.5 text-sm"
                  >
                    <option value="">{t("select_city")}</option>
                    <option value="Jerusalem">{t("jerusalem")}</option>
                    <option value="Ramallah">{t("ramallah")}</option>
                    <option value="Nablus">{t("nablus")}</option>
                    <option value="Hebron">{t("hebron")}</option>
                    <option value="Gaza">{t("gaza")}</option>
                  </select>
                </div>
                <div>
                  <label className="text-sm font-medium mb-1 block flex items-center gap-1.5">
                    <Phone className="w-4 h-4 text-primary" /> {t("phone")}
                  </label>
                  <input
                    required
                    name="phone"
                    type="tel"
                    className="w-full rounded-xl bg-card text-card-foreground border border-input focus:border-primary focus:ring-1 focus:ring-primary px-4 py-2.5 text-sm"
                    placeholder="059xxxxxxx"
                  />
                </div>
              </div>

              <div>
                <label className="text-sm font-medium mb-1 block">{t("description")}</label>
                <textarea
                  required
                  name="description"
                  rows="3"
                  className="w-full rounded-xl bg-card text-card-foreground border border-input focus:border-primary focus:ring-1 focus:ring-primary px-4 py-2.5 text-sm resize-none"
                  placeholder={t("description_ph")}
                />
              </div>

              <div className="pt-4">
                <Button
                  type="submit"
                  disabled={loading}
                  className="w-full rounded-full py-6 text-base shadow-md hover:shadow-primary/20 transition-applesque flex items-center justify-center gap-2 cursor-pointer"
                >
                  {loading ? t("submitting") : t("submit")}
                </Button>
                <p className="text-center text-xs text-muted-foreground mt-3">{t("terms")}</p>
              </div>
            </form>
          </div>
        )}
      </div>
    </div>
  );
}
