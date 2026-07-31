"use client";

import { useEffect, useState } from "react";
import type { CurrentUser } from "@/types";

// The signed-in user never changes within a page view, but several components
// need it to decide whether to show admin controls. Each one calling
// /api/auth/me independently meant the project detail page alone fired five
// identical requests on mount. Sharing one in-flight promise collapses those
// into a single round trip; the resolved value is reused for the rest of the
// session, and a full navigation reload clears it naturally.
let cached: CurrentUser | null | undefined;
let inFlight: Promise<CurrentUser | null> | null = null;

function fetchCurrentUser(): Promise<CurrentUser | null> {
  if (cached !== undefined) return Promise.resolve(cached);
  if (inFlight) return inFlight;

  const request: Promise<CurrentUser | null> = fetch("/api/auth/me")
    .then((res) => (res.ok ? res.json() : { user: null }))
    .then((data) => {
      const user: CurrentUser | null = data.user ?? null;
      cached = user;
      return user;
    })
    .catch(() => null);

  inFlight = request;
  // Only clear the slot if it's still this request — a concurrent
  // invalidate() may already have replaced it.
  request.finally(() => {
    if (inFlight === request) inFlight = null;
  });

  return request;
}

/** Clears the cache — call after an action that changes the user's own profile. */
export function invalidateCurrentUser() {
  cached = undefined;
  inFlight = null;
}

export function useCurrentUser() {
  const [user, setUser] = useState<CurrentUser | null>(cached ?? null);
  // Distinguishes "no user" from "not known yet" so callers can avoid
  // rendering a non-admin view for a beat before the real answer arrives.
  const [loaded, setLoaded] = useState(cached !== undefined);

  useEffect(() => {
    let active = true;
    fetchCurrentUser().then((u) => {
      if (!active) return;
      setUser(u);
      setLoaded(true);
    });
    return () => {
      active = false;
    };
  }, []);

  return { currentUser: user, loaded };
}
