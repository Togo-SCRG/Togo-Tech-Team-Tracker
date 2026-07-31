"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { Columns3 } from "lucide-react";
import { cn } from "@/lib/utils";
import { Checkbox } from "./Checkbox";

export interface ColumnDef {
  key: string;
  label: string;
}

const GAP = 6;
const MENU_WIDTH = 224; // w-56

export function ColumnsMenu({
  columns,
  visible,
  onToggle,
}: {
  columns: ColumnDef[];
  visible: Record<string, boolean>;
  onToggle: (key: string) => void;
}) {
  const [open, setOpen] = useState(false);
  const [mounted, setMounted] = useState(false);
  const [pos, setPos] = useState<{ top: number; left: number } | null>(null);
  const buttonRef = useRef<HTMLButtonElement>(null);
  const menuRef = useRef<HTMLDivElement>(null);

  useEffect(() => setMounted(true), []);

  // Anchored to the button but rendered at the document root. The tables this
  // sits above live in panels with `overflow-hidden` (for their rounded
  // corners), which clipped the dropdown when it was a normal absolute child.
  const reposition = useCallback(() => {
    const rect = buttonRef.current?.getBoundingClientRect();
    if (!rect) return;
    setPos({
      top: rect.bottom + GAP,
      // Right-aligned with the button, clamped so it can't run off-screen on
      // narrow viewports.
      left: Math.max(GAP, Math.min(rect.right - MENU_WIDTH, window.innerWidth - MENU_WIDTH - GAP)),
    });
  }, []);

  useEffect(() => {
    if (!open) return;
    reposition();

    function onOutside(e: MouseEvent) {
      const target = e.target as Node;
      // The menu is portaled, so it isn't inside the button's container —
      // both have to be checked or clicking a checkbox would close the menu.
      if (buttonRef.current?.contains(target) || menuRef.current?.contains(target)) return;
      setOpen(false);
    }
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") setOpen(false);
    }

    document.addEventListener("mousedown", onOutside);
    document.addEventListener("keydown", onKey);
    // Follows the button rather than closing, so scrolling a long table doesn't
    // dismiss the menu mid-change. Capture phase catches scroll on ancestors.
    window.addEventListener("scroll", reposition, true);
    window.addEventListener("resize", reposition);
    return () => {
      document.removeEventListener("mousedown", onOutside);
      document.removeEventListener("keydown", onKey);
      window.removeEventListener("scroll", reposition, true);
      window.removeEventListener("resize", reposition);
    };
  }, [open, reposition]);

  const hiddenCount = columns.filter((c) => visible[c.key] === false).length;

  return (
    <>
      <button
        ref={buttonRef}
        type="button"
        onClick={() => setOpen((o) => !o)}
        aria-expanded={open}
        className={cn(
          "flex shrink-0 items-center gap-2 rounded-md border px-3 py-2 text-sm font-semibold transition-colors",
          open
            ? "border-togo-blue text-togo-blue"
            : "border-togo-border text-togo-muted hover:border-togo-blue hover:text-togo-white"
        )}
        title="Choose visible columns"
      >
        <Columns3 size={16} />
        <span className="hidden sm:inline">Columns</span>
        {hiddenCount > 0 && (
          <span className="flex h-4 min-w-[16px] items-center justify-center rounded-full bg-togo-blue px-1 text-[10px] font-bold text-white">
            {hiddenCount}
          </span>
        )}
      </button>

      {open &&
        mounted &&
        pos &&
        createPortal(
          <div
            ref={menuRef}
            style={{ top: pos.top, left: pos.left, width: MENU_WIDTH }}
            className="animate-fade-in fixed z-50 max-h-[70vh] overflow-y-auto rounded-md border border-togo-border bg-togo-surface p-2 shadow-[var(--shadow-modal)]"
          >
            <p className="px-2 py-1 text-xs font-bold uppercase tracking-widest text-togo-faint">Show Columns</p>
            {columns.map((c) => (
              <label
                key={c.key}
                className="flex cursor-pointer items-center gap-2 rounded px-2 py-1.5 text-sm text-togo-white transition-colors hover:bg-[var(--togo-hover)]"
              >
                <Checkbox
                  checked={visible[c.key] !== false}
                  onChange={() => onToggle(c.key)}
                  label={`Show the ${c.label} column`}
                />
                {c.label}
              </label>
            ))}
          </div>,
          document.body
        )}
    </>
  );
}
