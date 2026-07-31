"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { AlertCircle, KeyRound, UserPlus } from "lucide-react";
import { Modal } from "@/components/ui/Modal";
import { Input, Label, Select } from "@/components/ui/Input";
import { Button } from "@/components/ui/Button";
import { useToast } from "@/components/ui/Toast";
import { CredentialsPanel } from "@/components/access/CredentialsPanel";
import { ACCESS_LEVEL_HINTS, ACCESS_LEVEL_LABELS, invitableLevels } from "@/lib/accessLevels";
import type { AccessLevel } from "@/types";

interface Created {
  name: string;
  email: string;
  password: string;
  accessLevel: AccessLevel;
}

export function CreateUserButton({ callerLevel }: { callerLevel: AccessLevel }) {
  const router = useRouter();
  const toast = useToast();
  const levels = invitableLevels(callerLevel);

  const [open, setOpen] = useState(false);
  const [name, setName] = useState("");
  const [role, setRole] = useState("");
  const [email, setEmail] = useState("");
  // Default to the least privileged option rather than the most.
  const [accessLevel, setAccessLevel] = useState<AccessLevel>("user");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  // Set once the account exists — the form is replaced by the credentials,
  // which are the only copy of the password that will ever exist.
  const [created, setCreated] = useState<Created | null>(null);

  // A plain user can't create accounts, so there's nothing to render.
  if (levels.length === 0) return null;

  function reset() {
    setName("");
    setRole("");
    setEmail("");
    setAccessLevel("user");
    setError(null);
    setCreated(null);
  }

  function openModal() {
    reset();
    setOpen(true);
  }

  function closeModal() {
    setOpen(false);
    reset();
  }

  const emailInvalid = email.trim() !== "" && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim());
  const canSubmit = name.trim() !== "" && role.trim() !== "" && email.trim() !== "" && !emailInvalid;

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    setError(null);
    try {
      const res = await fetch("/api/users", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name, role, email, accessLevel }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        setError(data.error || "Failed to create the account.");
        setSaving(false);
        return;
      }
      setCreated({
        name: name.trim(),
        email: email.trim().toLowerCase(),
        password: data.tempPassword,
        accessLevel,
      });
      toast.success(`${name.trim()}'s account was created.`);
      router.refresh();
    } catch {
      setError("Something went wrong. Please try again.");
    } finally {
      setSaving(false);
    }
  }

  return (
    <>
      <Button size="sm" onClick={openModal}>
        <UserPlus size={14} /> New user
      </Button>

      <Modal open={open} onClose={closeModal} title={created ? "Account created" : "New user"}>
        {created ? (
          <div className="space-y-4">
            <p className="text-sm text-togo-muted">
              <span className="font-semibold text-togo-white">{created.name}</span> can sign in as{" "}
              {ACCESS_LEVEL_LABELS[created.accessLevel].toLowerCase()} with the details below. No email was sent — pass
              these on yourself.
            </p>

            <CredentialsPanel email={created.email} password={created.password} onDone={closeModal} />
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <div>
                <Label htmlFor="new-user-name" required>
                  Name
                </Label>
                <Input
                  id="new-user-name"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="e.g. Jane Doe"
                  autoFocus
                  required
                />
              </div>
              <div>
                <Label htmlFor="new-user-role" required hint="Job title">
                  Role
                </Label>
                <Input
                  id="new-user-role"
                  value={role}
                  onChange={(e) => setRole(e.target.value)}
                  placeholder="e.g. Backend Engineer"
                  required
                />
              </div>
            </div>

            <div>
              <Label htmlFor="new-user-email" required hint="Used to sign in">
                Email
              </Label>
              <Input
                id="new-user-email"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="name@harnesstogo.com"
                autoComplete="off"
                aria-invalid={emailInvalid}
                required
              />
              {emailInvalid && (
                <p className="mt-1.5 text-[11px] text-[var(--status-blocked-fg)]">
                  That doesn&apos;t look like a valid email address.
                </p>
              )}
            </div>

            <div>
              <Label htmlFor="new-user-level" required>
                Access level
              </Label>
              <Select
                id="new-user-level"
                value={accessLevel}
                onChange={(e) => setAccessLevel(e.target.value as AccessLevel)}
              >
                {levels.map((l) => (
                  <option key={l} value={l}>
                    {ACCESS_LEVEL_LABELS[l]}
                  </option>
                ))}
              </Select>
              <p className="mt-1.5 text-[11px] text-togo-faint">{ACCESS_LEVEL_HINTS[accessLevel]}</p>
              {/* Explains the missing super-admin option rather than leaving an
                  admin wondering why the list is short. */}
              {callerLevel === "admin" && (
                <p className="mt-1 text-[11px] text-togo-faint">
                  Only the super admin can create another super admin.
                </p>
              )}
              {accessLevel === "client" && (
                <p className="mt-1 text-[11px] text-[var(--status-hold-fg)]">
                  Clients appear under Featured Clients on the Team page rather than in the member list, and can
                  read everything without being able to change any of it.
                </p>
              )}
            </div>

            <div className="flex items-start gap-2 rounded-md border border-togo-blue/30 bg-togo-blue/[0.06] px-3 py-2.5">
              <KeyRound size={15} className="mt-0.5 shrink-0 text-togo-blue" />
              <p className="text-[11px] leading-relaxed text-togo-muted">
                A password is generated and shown once on the next screen. No email is sent — you pass the details on
                yourself. They&apos;ll show as <span className="font-semibold text-togo-muted">Pending</span> in the
                list until they sign in.
              </p>
            </div>

            {error && (
              <div
                role="alert"
                className="flex items-start gap-2 rounded-md border border-[var(--status-blocked-border)] bg-[var(--status-blocked-bg)] px-3 py-2"
              >
                <AlertCircle size={15} className="mt-0.5 shrink-0 text-[var(--status-blocked-fg)]" />
                <p className="text-sm text-[var(--status-blocked-fg)]">{error}</p>
              </div>
            )}

            <div className="flex justify-end gap-3 pt-2">
              <Button type="button" variant="secondary" onClick={closeModal} disabled={saving}>
                Cancel
              </Button>
              <Button type="submit" disabled={saving || !canSubmit}>
                {saving ? "Creating..." : "Create account"}
              </Button>
            </div>
          </form>
        )}
      </Modal>
    </>
  );
}
