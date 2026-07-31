"use client";

import { useEffect, useRef } from "react";

/**
 * Global single-key shortcuts. Keys are ignored while the user is typing in a
 * field or a modal is open, so "n" only means "new" when it can't mean the
 * letter n. Pass `{ "/": fn, n: fn }` — keys are matched case-insensitively.
 */
export function useHotkeys(handlers: Record<string, (e: KeyboardEvent) => void>, enabled = true) {
  // Callers pass a fresh object literal every render; keeping it in a ref lets
  // the listener stay mounted instead of being torn down and re-added.
  const handlersRef = useRef(handlers);
  handlersRef.current = handlers;

  useEffect(() => {
    if (!enabled) return;

    function isTypingTarget(target: EventTarget | null): boolean {
      if (!(target instanceof HTMLElement)) return false;
      const tag = target.tagName;
      return tag === "INPUT" || tag === "TEXTAREA" || tag === "SELECT" || target.isContentEditable;
    }

    function onKeyDown(e: KeyboardEvent) {
      if (e.metaKey || e.ctrlKey || e.altKey) return;
      if (isTypingTarget(e.target)) return;
      // A shortcut firing behind an open dialog would act on the hidden page.
      if (document.querySelector("[data-modal-open]")) return;

      const map = handlersRef.current;
      const handler = map[e.key] ?? map[e.key.toLowerCase()];
      if (handler) {
        e.preventDefault();
        handler(e);
      }
    }

    document.addEventListener("keydown", onKeyDown);
    return () => document.removeEventListener("keydown", onKeyDown);
  }, [enabled]);
}
