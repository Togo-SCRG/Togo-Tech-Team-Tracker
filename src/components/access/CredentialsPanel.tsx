"use client";

import { useState } from "react";
import { AlertCircle, Check, Copy, KeyRound } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { useToast } from "@/components/ui/Toast";

/**
 * Shown once after an account is created, in both the Access Levels "New user"
 * flow and Team → Add Member. Shared so the two can't drift — in particular the
 * copied text, which is pasted straight into a message and shouldn't carry any
 * surrounding prose.
 */
export function CredentialsPanel({
  email,
  password,
  onDone,
}: {
  email: string;
  password: string;
  onDone: () => void;
}) {
  const toast = useToast();
  const [copied, setCopied] = useState(false);

  // Just the two fields, nothing else — whoever sends this writes their own
  // message around it.
  const copyText = `Email: ${email}\nTemporary password: ${password}`;

  async function copy() {
    try {
      await navigator.clipboard.writeText(copyText);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      toast.error("Couldn't copy — select the details and copy them manually.");
    }
  }

  return (
    <>
      <div className="rounded-md border border-togo-border bg-togo-surface-2/40 p-4">
        <p className="mb-3 flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-widest text-togo-faint">
          <KeyRound size={11} /> Sign-in details
        </p>
        <p className="text-[11px] text-togo-muted">Email</p>
        <p className="mb-3 select-all break-all text-sm font-semibold text-togo-white">{email}</p>
        <p className="text-[11px] text-togo-muted">Temporary password</p>
        <p className="select-all font-mono text-lg font-bold tracking-wider text-togo-white">{password}</p>
      </div>

      {/* The password is stored only as a hash, so this dialog really is the
          only chance to capture it. */}
      <div className="flex items-start gap-2 rounded-md border border-[var(--status-hold-border)] bg-[var(--status-hold-bg)] px-3 py-2.5">
        <AlertCircle size={15} className="mt-0.5 shrink-0 text-[var(--status-hold-fg)]" />
        <p className="text-[11px] leading-relaxed text-[var(--status-hold-fg)]">
          Copy this now — it isn&apos;t stored anywhere and can&apos;t be shown again. If you lose it, you&apos;ll need
          to set them a new password.
        </p>
      </div>

      <div className="flex justify-end gap-3">
        <Button type="button" variant="secondary" onClick={copy}>
          {copied ? (
            <>
              <Check size={14} /> Copied
            </>
          ) : (
            <>
              <Copy size={14} /> Copy details
            </>
          )}
        </Button>
        <Button type="button" onClick={onDone}>
          Done
        </Button>
      </div>
    </>
  );
}
