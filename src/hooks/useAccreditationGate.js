"use client";

import { useEffect, useState } from "react";
import { useAuth } from "@/components/auth/AuthProvider";
import { getCurrentProfile } from "@/lib/supabase/service";

export function useAccreditationGate() {
  const { user, loading: authLoading } = useAuth();
  const [state, setState] = useState({ ready: false, restricted: true });

  useEffect(() => {
    let cancelled = false;
    if (authLoading) return undefined;
    if (!user?.id) {
      // eslint-disable-next-line react-hooks/set-state-in-effect -- protected gate derivation, one-shot (immutable logic)
      setState({ ready: true, restricted: false });
      return undefined;
    }

    getCurrentProfile().then((profile) => {
      if (cancelled) return;
      const restricted = !profile || profile.status !== "active" || !profile.is_verified;
      setState({ ready: true, restricted });
    });

    return () => {
      cancelled = true;
    };
  }, [authLoading, user?.id]);

  return state;
}
