"use client";

import { useEffect, useState } from "react";
import { usePathname } from "next/navigation";

export type NotificationFilter = "all" | "unread" | "archived";

export interface NotificationItem {
  id: string;
  type: string;
  project: string;
  role: string | null;
  readAt: string | null;
  archivedAt: string | null;
  createdAt: string;
  actorName: string | null;
  actorAvatarUrl: string | null;
}

// Module-level so the sidebar badge, the topbar bell and the notifications page
// share one number. Without this, one of them could clear while the others
// carried on showing a count until the next navigation.
//
// The badge tracks *unseen*, not unread: opening the bell or the notifications
// page silences it, while individual items stay unread until acted on.
let badgeCount = 0;
const listeners = new Set<(n: number) => void>();

function publish(n: number) {
  badgeCount = n;
  listeners.forEach((l) => l(n));
}

/** Call after changing state so every subscriber updates at once. */
export function setUnreadCount(n: number) {
  publish(Math.max(0, n));
}

/**
 * Clears the badge. Called when the notification area is opened — the bell, the
 * sidebar link, or landing on the page directly. Optimistic so the badge
 * disappears on the click rather than after the round trip.
 */
export function markAllSeen() {
  if (badgeCount === 0) return;
  publish(0);
  fetch("/api/notifications/seen", { method: "POST" }).catch(() => {});
}

export async function fetchNotifications(filter: NotificationFilter = "all"): Promise<{
  notifications: NotificationItem[];
  unreadCount: number;
  archivedCount: number;
  unseenCount: number;
}> {
  const empty = { notifications: [], unreadCount: 0, archivedCount: 0, unseenCount: 0 };
  try {
    const res = await fetch(`/api/notifications?filter=${filter}`);
    if (!res.ok) return empty;
    const data = await res.json();
    const result = {
      notifications: (data.notifications || []) as NotificationItem[],
      unreadCount: (data.unreadCount || 0) as number,
      archivedCount: (data.archivedCount || 0) as number,
      unseenCount: (data.unseenCount || 0) as number,
    };
    // Published on every fetch, whichever tab asked, because the counts come
    // back independently of the filter.
    publish(result.unseenCount);
    return result;
  } catch {
    return empty;
  }
}

/**
 * Count for the nav badge (unseen). Refreshed on mount, on navigation, and when
 * the tab regains focus — enough to notice an assignment made while the app was
 * open, without polling on a timer.
 */
export function useUnreadNotifications(): number {
  const pathname = usePathname();
  const [count, setCount] = useState(badgeCount);

  useEffect(() => {
    listeners.add(setCount);
    return () => {
      listeners.delete(setCount);
    };
  }, []);

  useEffect(() => {
    fetchNotifications();
  }, [pathname]);

  useEffect(() => {
    function onFocus() {
      fetchNotifications();
    }
    window.addEventListener("focus", onFocus);
    return () => window.removeEventListener("focus", onFocus);
  }, []);

  return count;
}
