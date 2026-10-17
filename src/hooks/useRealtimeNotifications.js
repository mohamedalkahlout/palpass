"use client";

/**
 * useRealtimeNotifications — single shared Realtime channel per user.
 * Header + Dashboard (and any other consumers) share one WebSocket subscription.
 * Channel is removed only when the last subscriber unmounts.
 */

import { useEffect, useState, useCallback } from "react";
import { createClient } from "@/lib/supabase/client";

const shared = {
  userId: null,
  channel: null,
  notifications: [],
  listeners: new Set(),
  fetchPromise: null,
};

function emit() {
  for (const listener of shared.listeners) {
    listener(shared.notifications);
  }
}

function teardownChannel() {
  if (!shared.channel) return;
  try {
    const supabase = createClient();
    supabase.removeChannel(shared.channel);
  } catch {
    // ignore cleanup errors
  }
  shared.channel = null;
  shared.userId = null;
  shared.fetchPromise = null;
  shared.notifications = [];
}

function ensureSubscription(userId) {
  const supabase = createClient();

  if (shared.userId === userId && shared.channel) {
    return shared.fetchPromise;
  }

  teardownChannel();
  shared.userId = userId;

  shared.fetchPromise = supabase
    .from("notifications")
    .select("*")
    .eq("user_id", userId)
    .order("created_at", { ascending: false })
    .limit(30)
    .then(({ data }) => {
      if (shared.userId !== userId) return;
      shared.notifications = data || [];
      emit();
    })
    .catch((err) => {
      console.error("useRealtimeNotifications initial fetch:", err);
    });

  const channel = supabase
    .channel(`notifications:${userId}`)
    .on(
      "postgres_changes",
      {
        event: "INSERT",
        schema: "public",
        table: "notifications",
        filter: `user_id=eq.${userId}`,
      },
      (payload) => {
        if (shared.userId !== userId) return;
        shared.notifications = [payload.new, ...shared.notifications];
        emit();
      }
    )
    .subscribe();

  shared.channel = channel;
  return shared.fetchPromise;
}

export function useRealtimeNotifications(userId, initialNotifications = []) {
  const [notifications, setNotifications] = useState(() =>
    userId && shared.userId === userId && shared.notifications.length
      ? shared.notifications
      : initialNotifications
  );

  useEffect(() => {
    if (!userId) {
      // eslint-disable-next-line react-hooks/set-state-in-effect -- clear shared list on sign-out (by design)
      setNotifications([]);
      return undefined;
    }

    const onUpdate = (list) => setNotifications(list);
    shared.listeners.add(onUpdate);
    ensureSubscription(userId);

    if (shared.userId === userId) {
      setNotifications(shared.notifications);
    }

    return () => {
      shared.listeners.delete(onUpdate);
      if (shared.listeners.size === 0) {
        teardownChannel();
      }
    };
  }, [userId]);

  const unreadCount = notifications.filter((n) => !n.is_read).length;

  const markRead = useCallback(
    async (notifId) => {
      const next = notifications.map((n) =>
        n.id === notifId ? { ...n, is_read: true } : n
      );
      shared.notifications = next;
      emit();
      const supabase = createClient();
      await supabase
        .from("notifications")
        .update({ is_read: true })
        .eq("id", notifId)
        .eq("user_id", userId);
    },
    [userId, notifications]
  );

  const markAllRead = useCallback(async () => {
    const next = notifications.map((n) => ({ ...n, is_read: true }));
    shared.notifications = next;
    emit();
    const supabase = createClient();
    await supabase
      .from("notifications")
      .update({ is_read: true })
      .eq("user_id", userId)
      .eq("is_read", false);
  }, [userId, notifications]);

  return { notifications, unreadCount, markRead, markAllRead };
}
