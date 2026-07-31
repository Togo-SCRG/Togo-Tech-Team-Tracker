"use client";

import { useEffect, useLayoutEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { cn } from "@/lib/utils";

/**
 * Floating content anchored to an element, rendered at the end of `<body>`.
 *
 * Panels and table containers in this app use `overflow-hidden` to clip their
 * rounded corners, which also clips any absolutely-positioned popover inside
 * them — a calendar opening from a short table gets cut off at the panel's
 * bottom edge. Escaping to the body and positioning with `fixed` is the only
 * reliable fix; `overflow` on an ancestor can't clip a fixed element.
 *
 * The trade-off is that position has to be recomputed on scroll and resize,
 * since the anchor moves and the panel doesn't follow it automatically.
 */
export function PopoverPortal({
  anchorRef,
  open,
  onClose,
  width,
  height,
  align = "left",
  className,
  children,
}: {
  anchorRef: React.RefObject<HTMLElement>;
  open: boolean;
  /** Called on an outside click. Clicks inside the panel or the anchor don't count. */
  onClose: () => void;
  /** Panel width, used to keep it inside the viewport horizontally. */
  width: number;
  /** Approximate panel height, used to decide whether to flip above the anchor. */
  height: number;
  align?: "left" | "right";
  className?: string;
  children: React.ReactNode;
}) {
  const [pos, setPos] = useState<{ top: number; left: number } | null>(null);
  const panelRef = useRef<HTMLDivElement>(null);

  useLayoutEffect(() => {
    if (!open) return;
    function place() {
      const r = anchorRef.current?.getBoundingClientRect();
      if (!r) return;
      const preferred = align === "right" ? r.right - width : r.left;
      const left = Math.max(8, Math.min(preferred, window.innerWidth - width - 8));
      // Flip above when there isn't room below, and clamp so a panel taller
      // than the viewport still starts on screen rather than off the top.
      const below = r.bottom + 6;
      const top = below + height > window.innerHeight ? Math.max(8, r.top - height - 6) : below;
      setPos({ top, left });
    }
    place();
    // `true` for capture: the anchor may sit inside a scrolling container, and
    // scroll events there don't bubble to the window.
    window.addEventListener("resize", place);
    window.addEventListener("scroll", place, true);
    return () => {
      window.removeEventListener("resize", place);
      window.removeEventListener("scroll", place, true);
    };
  }, [open, anchorRef, width, height, align]);

  useEffect(() => {
    if (!open) return;
    function onOutside(e: MouseEvent) {
      const target = e.target as Node;
      if (anchorRef.current?.contains(target) || panelRef.current?.contains(target)) return;
      onClose();
    }
    document.addEventListener("mousedown", onOutside);
    return () => document.removeEventListener("mousedown", onOutside);
  }, [open, onClose, anchorRef]);

  if (!open || !pos || typeof document === "undefined") return null;

  return createPortal(
    <div
      ref={panelRef}
      className={cn("animate-fade-in fixed z-[60]", className)}
      style={{ top: pos.top, left: pos.left }}
    >
      {children}
    </div>,
    document.body
  );
}
