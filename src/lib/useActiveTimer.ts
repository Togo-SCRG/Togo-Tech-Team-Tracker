"use client";

import { useEffect, useRef, useState } from "react";
import { toDateInputValue } from "@/lib/utils";

const STORAGE_KEY = "togo-active-timer";
const SYNC_EVENT = "togo-timer-sync";

export interface ActiveTimer {
  project: string;
  phase: string;
  workDone: string;
  startedAt: number; // epoch ms
}

function readStored(): ActiveTimer | null {
  if (typeof window === "undefined") return null;
  const stored = localStorage.getItem(STORAGE_KEY);
  if (!stored) return null;
  try {
    return JSON.parse(stored);
  } catch {
    localStorage.removeItem(STORAGE_KEY);
    return null;
  }
}

// Timer state lives in localStorage + a same-tab custom event, since a
// timer can be started from one project's page and needs to stay visible
// (and stoppable) from the Topbar — or any other project page — without a
// full page reload. The native `storage` event only fires in *other* tabs,
// so we dispatch our own event on every start/stop to keep same-tab
// instances of this hook in sync.
export function useActiveTimer() {
  const [active, setActive] = useState<ActiveTimer | null>(null);
  const [elapsedSeconds, setElapsedSeconds] = useState(0);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  useEffect(() => {
    setActive(readStored());
    function onSync() {
      setActive(readStored());
    }
    window.addEventListener(SYNC_EVENT, onSync);
    return () => window.removeEventListener(SYNC_EVENT, onSync);
  }, []);

  useEffect(() => {
    if (!active) {
      if (intervalRef.current) clearInterval(intervalRef.current);
      setElapsedSeconds(0);
      return;
    }
    function tick() {
      setElapsedSeconds(Math.max(0, Math.floor((Date.now() - active!.startedAt) / 1000)));
    }
    tick();
    intervalRef.current = setInterval(tick, 1000);
    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current);
    };
  }, [active]);

  function start(project: string, phase: string, workDone: string) {
    const timer: ActiveTimer = { project, phase, workDone, startedAt: Date.now() };
    localStorage.setItem(STORAGE_KEY, JSON.stringify(timer));
    setActive(timer);
    window.dispatchEvent(new Event(SYNC_EVENT));
  }

  async function stop(onLogged?: () => void): Promise<boolean> {
    if (!active) return false;
    setSaving(true);
    setError(null);
    const durationMinutes = Math.max(1, Math.round((Date.now() - active.startedAt) / 60000));

    try {
      const res = await fetch("/api/time-entries", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          project: active.project,
          phase: active.phase,
          date: toDateInputValue(new Date(active.startedAt)),
          durationMinutes,
          note: active.workDone,
        }),
      });

      if (!res.ok) {
        const data = await res.json();
        setError(data.error || "Failed to save time entry.");
        return false;
      }

      localStorage.removeItem(STORAGE_KEY);
      setActive(null);
      window.dispatchEvent(new Event(SYNC_EVENT));
      onLogged?.();
      return true;
    } catch {
      setError("Something went wrong. Please try again.");
      return false;
    } finally {
      setSaving(false);
    }
  }

  return { active, elapsedSeconds, saving, error, start, stop };
}
