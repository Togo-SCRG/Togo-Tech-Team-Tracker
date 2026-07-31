"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { AlertTriangle, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { ConfirmDialog } from "@/components/ui/ConfirmDialog";
import { useToast } from "@/components/ui/Toast";
import { useCurrentUser } from "@/lib/useCurrentUser";
import { can } from "@/lib/capabilities";

export function DeleteProjectButton({ projectName }: { projectName: string }) {
  const router = useRouter();
  const toast = useToast();
  const { currentUser } = useCurrentUser();
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleDelete() {
    setDeleting(true);
    setError(null);
    const res = await fetch(`/api/projects/${encodeURIComponent(projectName)}`, { method: "DELETE" });
    if (res.ok) {
      toast.success(`"${projectName}" was deleted.`);
      router.push("/projects");
      router.refresh();
    } else {
      const data = await res.json();
      setError(data.error || "Failed to delete project.");
      setDeleting(false);
    }
  }

  if (!can(currentUser?.capabilities, "project.delete")) return null;

  return (
    <>
      <div className="space-y-4 rounded-md border border-[var(--status-blocked-border)] bg-togo-surface p-6">
        <div className="flex items-start gap-2.5">
          <AlertTriangle size={16} className="mt-0.5 shrink-0 text-[var(--status-blocked-fg)]" />
          <div>
            <p className="text-sm font-semibold text-[var(--status-blocked-fg)]">Danger zone</p>
            <p className="mt-1 text-sm text-togo-muted">
              Permanently delete &ldquo;{projectName}&rdquo;, including every update, time entry, and team assignment
              for this project across the whole team. This can&apos;t be undone.
            </p>
          </div>
        </div>
        <Button
          variant="secondary"
          onClick={() => setConfirmOpen(true)}
          className="border-[var(--status-blocked-fg)] text-[var(--status-blocked-fg)] hover:bg-[var(--status-blocked-bg)]"
        >
          <Trash2 size={16} /> Delete project
        </Button>
      </div>

      <ConfirmDialog
        open={confirmOpen}
        title="Delete Project"
        description={`Are you sure you want to permanently delete "${projectName}"? This removes every update, time entry, and team assignment for this project across the whole team. This can't be undone.${
          error ? ` ${error}` : ""
        }`}
        confirmLabel="Delete"
        danger
        loading={deleting}
        onConfirm={handleDelete}
        onCancel={() => {
          setConfirmOpen(false);
          setError(null);
        }}
      />
    </>
  );
}
