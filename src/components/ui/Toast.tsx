"use client";

import { createContext, useCallback, useContext, useEffect, useState } from "react";
import { createPortal } from "react-dom";
import { CheckCircle2, XCircle, X } from "lucide-react";
import { cn } from "@/lib/utils";

interface Toast {
  id: number;
  message: string;
  variant: "success" | "error";
}

interface ToastContextValue {
  success: (message: string) => void;
  error: (message: string) => void;
}

const ToastContext = createContext<ToastContextValue | null>(null);

let nextId = 1;

export function ToastProvider({ children }: { children: React.ReactNode }) {
  const [toasts, setToasts] = useState<Toast[]>([]);
  const [mounted, setMounted] = useState(false);

  // Portal to <body> only after mount — avoids a hydration mismatch.
  useEffect(() => setMounted(true), []);

  const dismiss = useCallback((id: number) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  }, []);

  const push = useCallback(
    (message: string, variant: Toast["variant"]) => {
      const id = nextId++;
      setToasts((prev) => [...prev, { id, message, variant }]);
      setTimeout(() => dismiss(id), 4000);
    },
    [dismiss]
  );

  const value: ToastContextValue = {
    success: (message) => push(message, "success"),
    error: (message) => push(message, "error"),
  };

  return (
    <ToastContext.Provider value={value}>
      {children}
      {mounted &&
        createPortal(
          // aria-live on the container (not each toast) so messages added
          // later are announced — a live region has to exist before the text
          // lands in it to be picked up.
          <div
            aria-live="polite"
            aria-atomic="false"
            className="fixed bottom-4 right-4 z-[100] flex w-full max-w-sm flex-col gap-2 px-4 sm:px-0"
          >
            {toasts.map((t) => (
              <div
                key={t.id}
                role={t.variant === "error" ? "alert" : "status"}
                className={cn(
                  "animate-toast-in flex items-start gap-2.5 rounded-md border bg-togo-surface px-4 py-3 text-sm shadow-[var(--shadow-modal)]",
                  t.variant === "success"
                    ? "border-[var(--status-completed-border)]"
                    : "border-[var(--status-blocked-border)]"
                )}
              >
                {t.variant === "success" ? (
                  <CheckCircle2 size={18} className="mt-0.5 shrink-0 text-[var(--status-completed-fg)]" />
                ) : (
                  <XCircle size={18} className="mt-0.5 shrink-0 text-[var(--status-blocked-fg)]" />
                )}
                <p className="flex-1 text-togo-white">{t.message}</p>
                <button
                  onClick={() => dismiss(t.id)}
                  aria-label="Dismiss notification"
                  className="shrink-0 text-togo-faint transition-colors hover:text-togo-white"
                >
                  <X size={14} />
                </button>
              </div>
            ))}
          </div>,
          document.body
        )}
    </ToastContext.Provider>
  );
}

export function useToast() {
  const ctx = useContext(ToastContext);
  if (!ctx) throw new Error("useToast must be used within a ToastProvider");
  return ctx;
}
