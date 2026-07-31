"use client";

import { useState } from "react";
import { KeyRound } from "lucide-react";
import { Modal } from "@/components/ui/Modal";
import { CredentialsPanel } from "@/components/access/CredentialsPanel";
import { Input, Label } from "@/components/ui/Input";
import { Button } from "@/components/ui/Button";
import { useToast } from "@/components/ui/Toast";

export function AddMemberModal({
  open,
  onClose,
  onSaved,
}: {
  open: boolean;
  onClose: () => void;
  onSaved: () => void;
}) {
  const toast = useToast();
  const [name, setName] = useState("");
  const [role, setRole] = useState("");
  const [email, setEmail] = useState("");
  // The generated password, shown once after the account is created.
  const [created, setCreated] = useState<{ email: string; password: string } | null>(null);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  function reset() {
    setName("");
    setRole("");
    setEmail("");
    setCreated(null);
    setError(null);
  }

  function handleClose() {
    reset();
    onClose();
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    setError(null);

    try {
      // Shares the tier-aware creation endpoint with the Access Levels page, so
      // there's one place that provisions accounts. Members are always created
      // at the 'user' tier from here; other tiers are chosen on that page.
      const res = await fetch("/api/users", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name, role, email, accessLevel: "user" }),
      });

      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        setError(data.error || "Failed to add member.");
        setSaving(false);
        return;
      }

      setCreated({ email: email.trim().toLowerCase(), password: data.tempPassword });
      toast.success("Member account created.");
      onSaved();
    } catch {
      setError("Something went wrong. Please try again.");
    } finally {
      setSaving(false);
    }
  }


  return (
    <Modal open={open} onClose={handleClose} title={created ? "Account created" : "Add Member"}>
      {created ? (
        <div className="space-y-4">
          <p className="text-sm text-togo-muted">No email was sent — pass these details on yourself.</p>

          <CredentialsPanel email={created.email} password={created.password} onDone={handleClose} />
        </div>
      ) : (
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <Label htmlFor="add-member-name" required>
              Name
            </Label>
            <Input
              id="add-member-name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="e.g. Jane Doe"
              required
            />
          </div>
          <div>
            <Label htmlFor="add-member-role" required>
              Role
            </Label>
            <Input
              id="add-member-role"
              value={role}
              onChange={(e) => setRole(e.target.value)}
              placeholder="e.g. Backend Engineer"
              required
            />
          </div>
          <div>
            <Label htmlFor="add-member-email" required hint="Used to sign in">
              Email
            </Label>
            <Input
              id="add-member-email"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="name@harnesstogo.com"
              required
            />
          </div>

          <div className="flex items-start gap-2 rounded-md border border-togo-blue/30 bg-togo-blue/[0.06] px-3 py-2.5">
            <KeyRound size={15} className="mt-0.5 shrink-0 text-togo-blue" />
            <p className="text-[11px] leading-relaxed text-togo-muted">
              A password is generated and shown once on the next screen.
            </p>
          </div>

          {error && (
            <p role="alert" className="text-sm text-[var(--status-blocked-fg)]">
              {error}
            </p>
          )}

          <div className="flex justify-end gap-3 pt-2">
            <Button type="button" variant="secondary" onClick={handleClose} disabled={saving}>
              Cancel
            </Button>
            <Button type="submit" disabled={saving}>
              {saving ? "Creating..." : "Add Member"}
            </Button>
          </div>
        </form>
      )}
    </Modal>
  );
}
