"use client";

import { Modal } from "./Modal";
import { Kbd } from "./Kbd";

const SHORTCUTS: { keys: string[]; description: string }[] = [
  { keys: ["/"], description: "Jump to search" },
  { keys: ["n"], description: "Log a new update" },
  { keys: ["t"], description: "Show today only" },
  { keys: ["w"], description: "Show this week" },
  { keys: ["v"], description: "Switch between table and card layout" },
  { keys: ["Esc"], description: "Close a dialog or clear search" },
  { keys: ["?"], description: "Open this list" },
];

export function ShortcutsModal({ open, onClose }: { open: boolean; onClose: () => void }) {
  return (
    <Modal open={open} onClose={onClose} title="Keyboard shortcuts" className="max-w-md">
      <ul className="divide-y divide-togo-border">
        {SHORTCUTS.map((s) => (
          <li key={s.description} className="flex items-center justify-between gap-4 py-2.5 first:pt-0 last:pb-0">
            <span className="text-sm text-togo-muted">{s.description}</span>
            <span className="flex shrink-0 items-center gap-1">
              {s.keys.map((k) => (
                <Kbd key={k}>{k}</Kbd>
              ))}
            </span>
          </li>
        ))}
      </ul>
      <p className="mt-4 border-t border-togo-border pt-3 text-xs text-togo-faint">
        Shortcuts stay out of the way while you&apos;re typing in a field or a dialog is open.
      </p>
    </Modal>
  );
}
