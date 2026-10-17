"use client";

import { useAuth } from "@/components/auth/AuthProvider";
import { useAuthModal } from "@/context/AuthModalContext";
import { useTranslations } from "next-intl";

export default function ProtectedAction({ children, onAction, className = "inline-block", ...props }) {
  const { user, loading } = useAuth();
  const { openAuthModal } = useAuthModal();
  const t = useTranslations("GuestAuth");

  const handleClick = (event) => {
    if (loading || !user) {
      event.preventDefault();
      event.stopPropagation();
      if (!loading) {
        openAuthModal({
          title: t("gate_title"),
          description: t("gate_description"),
        });
      }
      return;
    }
    if (onAction) onAction(event);
  };

  return (
    <div onClick={handleClick} className={className} {...props}>
      {children}
    </div>
  );
}
