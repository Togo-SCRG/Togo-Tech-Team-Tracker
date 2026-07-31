"use client";

import { useEffect, useState } from "react";
import { KeyRound } from "lucide-react";
import { Modal } from "@/components/ui/Modal";
import { ConfirmDialog } from "@/components/ui/ConfirmDialog";
import { CredentialsPanel } from "@/components/access/CredentialsPanel";
import { Input, Label } from "@/components/ui/Input";
import { Button } from "@/components/ui/Button";
import { useToast } from "@/components/ui/Toast";
import type { ClientItem } from "@/types";

interface Props {
  open: boolean;
  onClose: () => void;
  onSaved: () => void;
  onDeleted: () => void;
  editingClient: ClientItem | null;
}

export function ClientModal({ open, onClose, onSaved, onDeleted, editingClient }: Props) {
  const toast = useToast();
  const [name, setName] = useState("");
  const [role, setRole] = useState("");
  const [email, setEmail] = useState("");
  // The generated password, shown once after the account is created.
  const [created, setCreated] = useState<{ email: string; password: string } | null>(null);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [deleteConfirmOpen, setDeleteConfirmOpen] = useState(false);

  useEffect(() => {
    if (editingClient) {
      setName(editingClient.name);
      setRole(editingClient.role);
      setEmail(editingClient.email);
    } else {
      setName("");
      setRole("");
      setEmail("");
    }
    setCreated(null);
    setError(null);
  }, [editingClient, open]);

  function handleClose() {
    setCreated(null);
    onClose();
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    setError(null);

    try {
      if (editingClient) {
        const res = await fetch(`/api/clients/${editingClient.id}`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ name, role }),
        });
        if (!res.ok) {
          const data = await res.json().catch(() => ({}));
          setError(data.error || "Failed to save client.");
          setSaving(false);
          return;
        }
        toast.success("Client updated.");
        onSaved();
        handleClose();
        return;
      }

      // Same endpoint as Add Member, at the admin tier — a client *is* a
      // profile at that level, so this is one account-provisioning path rather
      // than two, and the password is generated server-side instead of being
      // typed in and reused.
      const res = await fetch("/api/users", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name, role, email, accessLevel: "client" }),
      });

      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        setError(data.error || "Failed to create the client account.");
        setSaving(false);
        return;
      }

      setCreated({ email: email.trim().toLowerCase(), password: data.tempPassword });
      toast.success("Client account created.");
      onSaved();
    } catch {
      setError("Something went wrong. Please try again.");
    } finally {
      setSaving(false);
    }
  }

  async function handleDelete() {
    if (!editingClient) return;
    setSaving(true);
    const res = await fetch(`/api/clients/${editingClient.id}`, { method: "DELETE" });
    if (res.ok) {
      setDeleteConfirmOpen(false);
      toast.success("Client account removed.");
      onDeleted();
      onClose();
    } else {
      const data = await res.json();
      setError(data.error || "Failed to delete client.");
      setDeleteConfirmOpen(false);
    }
    setSaving(false);
  }

  if (created) {
    return (
      <Modal open={open} onClose={handleClose} title="Client account created">
        <div className="space-y-4">
          <p className="text-sm text-togo-muted">No email was sent — pass these details on yourself.</p>
          <CredentialsPanel email={created.email} password={created.password} onDone={handleClose} />
        </div>
      </Modal>
    );
  }

  return (
    <Modal open={open} onClose={handleClose} title={editingClient ? "Edit Client" : "Add Client"}>
      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <Label required>Name</Label>
          <Input value={name} onChange={(e) => setName(e.target.value)} placeholder="e.g. David Chen" required />
        </div>
        <div>
          <Label required>Role</Label>
          <Input value={role} onChange={(e) => setRole(e.target.value)} placeholder="e.g. Chief Executive Officer" required />
        </div>

        {!editingClient && (
          <>
            <div>
              <Label required hint="Used to sign in">
                Email
              </Label>
              <Input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="client@company.com"
                required
              />
            </div>

            <div className="flex items-start gap-2 rounded-md border border-togo-blue/30 bg-togo-blue/[0.06] px-3 py-2.5">
              <KeyRound size={15} className="mt-0.5 shrink-0 text-togo-blue" />
              <p className="text-[11px] leading-relaxed text-togo-muted">
                A password is generated and shown once on the next screen. The account signs in at the client
                access level — read-only, so they can follow progress without changing anything.
              </p>
            </div>
          </>
        )}

        {editingClient && (
          <p className="text-xs text-togo-faint">
            Signs in as <span className="text-togo-muted">{editingClient.email}</span> with read-only access. The
            email can be changed from their profile page; the password can only be reset by the client themselves
            in Settings.
          </p>
        )}

        {error && (
          <p role="alert" className="text-sm text-[var(--status-blocked-fg)]">
            {error}
          </p>
        )}

        <div className="flex items-center justify-between pt-2">
          <div>
            {editingClient && (
              <Button
                type="button"
                variant="secondary"
                onClick={() => setDeleteConfirmOpen(true)}
                disabled={saving}
                className="border-[#EF4444] text-[#EF4444] hover:bg-[#EF4444]/10"
              >
                Delete
              </Button>
            )}
          </div>
          <div className="flex gap-3">
            <Button type="button" variant="secondary" onClick={handleClose} disabled={saving}>
              Cancel
            </Button>
            <Button type="submit" disabled={saving}>
              {saving ? (editingClient ? "Saving..." : "Creating...") : editingClient ? "Save" : "Add Client"}
            </Button>
          </div>
        </div>
      </form>

      <ConfirmDialog
        open={deleteConfirmOpen}
        title="Delete Client"
        description={`Are you sure you want to permanently delete ${editingClient?.name}'s account? This can't be undone.`}
        confirmLabel="Delete"
        danger
        loading={saving}
        onConfirm={handleDelete}
        onCancel={() => setDeleteConfirmOpen(false)}
      />
    </Modal>
  );
}
