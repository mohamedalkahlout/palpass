"use client";

import { createContext, useCallback, useContext, useRef, useState } from "react";
import { useRouter } from "@/i18n/routing";
import { useAuth } from "@/components/auth/AuthProvider";
import { createClient } from "@/lib/supabase/client";
import { GuestAuthModal } from "@/components/auth/GuestAuthModal";

const AuthModalContext = createContext({
  openAuthModal: () => {},
  requireAuth: (action) => action?.(),
});

export function AuthModalProvider({ children }) {
  const { user, loading } = useAuth();
  const router = useRouter();
  const pendingRef = useRef(null);
  const [open, setOpen] = useState(false);
  const [copy, setCopy] = useState(null);

  const openAuthModal = useCallback((actionOrOptions) => {
    if (typeof actionOrOptions === "function") {
      pendingRef.current = actionOrOptions;
      setCopy(null);
    } else if (actionOrOptions && typeof actionOrOptions === "object") {
      pendingRef.current = typeof actionOrOptions.onSuccess === "function" ? actionOrOptions.onSuccess : null;
      setCopy({
        title: actionOrOptions.title || "",
        description: actionOrOptions.description || "",
      });
    } else {
      pendingRef.current = null;
      setCopy(null);
    }
    setOpen(true);
  }, []);

  const requireAuth = useCallback(
    (action) => {
      if (loading) return;
      if (user) {
        action?.();
        return;
      }
      openAuthModal(action);
    },
    [loading, openAuthModal, user]
  );

  const finishAuthenticated = useCallback(async () => {
    const supabase = createClient();
    await supabase.auth.getUser();
    setOpen(false);
    const next = pendingRef.current;
    pendingRef.current = null;
    router.refresh();
    if (next) next();
  }, [router]);

  return (
    <AuthModalContext.Provider value={{ openAuthModal, requireAuth }}>
      {children}
      <GuestAuthModal
        open={open}
        title={copy?.title}
        description={copy?.description}
        onClose={() => {
          pendingRef.current = null;
          setCopy(null);
          setOpen(false);
        }}
        onAuthenticated={finishAuthenticated}
      />
    </AuthModalContext.Provider>
  );
}

export function useAuthModal() {
  return useContext(AuthModalContext);
}
