"use client";

import { useEffect, useState } from "react";
import { FileText, Pencil, Plus, Trash2 } from "lucide-react";
import { Textarea } from "@/components/ui/Input";
import { Button } from "@/components/ui/Button";
import { ConfirmDialog } from "@/components/ui/ConfirmDialog";
import { PrdField } from "@/components/projects/PrdField";
import { PrdPreviewModal } from "@/components/projects/PrdPreviewModal";
import { useToast } from "@/components/ui/Toast";
import { cn, formatBytes, formatDateLong } from "@/lib/utils";
import { useCurrentUser } from "@/lib/useCurrentUser";
import { can } from "@/lib/capabilities";

interface PrdFile {
  name: string;
  url: string;
  size: number | null;
  uploadedAt: string | null;
}

type Tab = "overview" | "prd";

/**
 * Overview and PRD in one tabbed card. They were previously two stacked
 * panels, which pushed everything else down the page for two fields that are
 * read once and then ignored — tabs keep both a click away without the height.
 */
export function ProjectDocs({
  projectName,
  initialOverview = "",
  initialPrd = "",
  isProjectMember,
}: {
  projectName: string;
  initialOverview?: string;
  initialPrd?: string;
  /** On this project — assigned, or has logged an update or time against it. */
  isProjectMember: boolean;
}) {
  const { currentUser, loaded } = useCurrentUser();
  const toast = useToast();
  const [tab, setTab] = useState<Tab>("overview");

  // Seeded from the server render so the text is there on first paint.
  const [overview, setOverview] = useState(initialOverview);
  const [prd, setPrd] = useState(initialPrd);
  const [prdFile, setPrdFile] = useState<PrdFile | null>(null);
  const [fileLoading, setFileLoading] = useState(true);

  const [editing, setEditing] = useState(false);
  const [draftOverview, setDraftOverview] = useState("");
  const [draftPrd, setDraftPrd] = useState("");
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [previewOpen, setPreviewOpen] = useState(false);
  const [removeConfirmOpen, setRemoveConfirmOpen] = useState(false);

  // Only the attached file needs a client fetch; the text comes from props.
  const loadFile = () => {
    fetch(`/api/project-files?project=${encodeURIComponent(projectName)}`)
      .then((res) => res.json())
      .then((data) => {
        setPrdFile(data.file || null);
        setFileLoading(false);
      })
      .catch(() => setFileLoading(false));
  };

  useEffect(loadFile, [projectName]);

  // Documenting a project is open to every signed-in member, not just admins
  // (migration 016 relaxed the matching database policies). Status and the
  // weekly cap are still admin-only and live in their own cards.
  // Same rule as status and timeline: the capability, plus either "manage every
  // project" or being on this one. A tier without manage.all — a plain user — is
  // a viewer on projects they aren't part of.
  const caps = currentUser?.capabilities;
  const canEdit =
    can(caps, "project.docs.edit") && (can(caps, "project.manage.all") || isProjectMember);

  function startEditing(which: Tab) {
    setTab(which);
    setDraftOverview(overview);
    setDraftPrd(prd);
    setError(null);
    setEditing(true);
  }

  function cancelEditing() {
    setEditing(false);
    setError(null);
  }

  async function handleSave(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    setError(null);
    const body =
      tab === "overview" ? { project: projectName, overview: draftOverview } : { project: projectName, prd: draftPrd };
    const res = await fetch("/api/project-settings", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });
    if (res.ok) {
      // "Added" vs "updated" is read off what was there before the save — the
      // form looks identical either way, so the toast is the only thing that
      // tells you which one just happened.
      const label = tab === "overview" ? "Overview" : "PRD";
      const hadContent = tab === "overview" ? !!overview : !!prd;
      if (tab === "overview") setOverview(draftOverview);
      else setPrd(draftPrd);
      setEditing(false);
      toast.success(`${label} ${hadContent ? "updated" : "added"}.`);
    } else {
      const data = await res.json().catch(() => ({}));
      setError(data.error || "Failed to save. Please try again.");
    }
    setSaving(false);
  }

  async function handleFileSelect(file: File) {
    setUploading(true);
    setError(null);
    const formData = new FormData();
    formData.append("project", projectName);
    formData.append("file", file);
    const res = await fetch("/api/project-files", { method: "POST", body: formData });
    if (res.ok) {
      loadFile();
      setEditing(false);
      toast.success(`“${file.name}” uploaded.`);
    } else {
      const data = await res.json().catch(() => ({}));
      setError(data.error || "Failed to upload file.");
    }
    setUploading(false);
  }

  async function handleRemoveFile() {
    setUploading(true);
    setError(null);
    // Captured before the state clears below, so the toast can still name it.
    const removedName = prdFile?.name;
    const res = await fetch(`/api/project-files?project=${encodeURIComponent(projectName)}`, { method: "DELETE" });
    if (res.ok) {
      setPrdFile(null);
      setRemoveConfirmOpen(false);
      toast.success(removedName ? `“${removedName}” removed.` : "PRD file removed.");
    } else {
      const data = await res.json().catch(() => ({}));
      setError(data.error || "Failed to remove the file.");
      setRemoveConfirmOpen(false);
    }
    setUploading(false);
  }

  const hasPrd = !!prd || !!prdFile;
  const hasAnything = !!overview || hasPrd;

  // Nothing to show and nothing this user could add — stay out of the way.
  if (!hasAnything && (fileLoading || !loaded || !canEdit)) return null;

  const TABS: { key: Tab; label: string; filled: boolean }[] = [
    { key: "overview", label: "Overview & Requirements", filled: !!overview },
    { key: "prd", label: "PRD", filled: hasPrd },
  ];

  const actionLabel = tab === "overview" ? (overview ? "Edit overview" : "Add overview") : hasPrd ? "Edit PRD" : "Add PRD";

  return (
    <section className="overflow-hidden rounded-md border border-togo-border bg-togo-surface">
      <div className="flex flex-wrap items-center gap-2 border-b border-togo-border px-4">
        <div role="tablist" aria-label="Project documents" className="flex">
          {TABS.map((t) => (
            <button
              key={t.key}
              role="tab"
              aria-selected={tab === t.key}
              onClick={() => {
                setTab(t.key);
                setEditing(false);
              }}
              className={cn(
                "-mb-px flex items-center gap-1.5 border-b-2 px-3 py-3 text-sm font-semibold transition-colors",
                tab === t.key
                  ? "border-togo-blue text-togo-white"
                  : "border-transparent text-togo-muted hover:text-togo-white"
              )}
            >
              {t.label}
              {/* A dot marks which tab actually has content, so an empty PRD
                  isn't a surprise after clicking through. */}
              {t.filled && <span className="h-1.5 w-1.5 rounded-full bg-togo-blue" aria-label="has content" />}
            </button>
          ))}
        </div>

        {canEdit && !editing && (
          <Button size="sm" variant="secondary" className="ml-auto my-2" onClick={() => startEditing(tab)}>
            {(tab === "overview" ? !!overview : hasPrd) ? <Pencil size={13} /> : <Plus size={13} />}
            {actionLabel}
          </Button>
        )}
      </div>

      <div className="p-4">
        {editing ? (
          <form onSubmit={handleSave} className="space-y-3">
            {tab === "overview" ? (
              <Textarea
                rows={4}
                autoFocus
                value={draftOverview}
                onChange={(e) => setDraftOverview(e.target.value)}
                placeholder="What is this project, in a few sentences?"
              />
            ) : (
              <PrdField
                prdText={draftPrd}
                onPrdTextChange={setDraftPrd}
                attachedFileName={prdFile?.name || null}
                attachedFileUrl={prdFile?.url || null}
                onFileSelect={handleFileSelect}
                onFileRemove={() => setRemoveConfirmOpen(true)}
                disabled={uploading}
              />
            )}
            <div className="flex items-center gap-3">
              <Button type="submit" size="sm" disabled={saving || uploading}>
                {saving ? "Saving..." : "Save"}
              </Button>
              <button
                type="button"
                onClick={cancelEditing}
                className="text-xs text-togo-faint transition-colors hover:text-togo-muted"
              >
                Cancel
              </button>
            </div>
          </form>
        ) : tab === "overview" ? (
          overview ? (
            <p className="whitespace-pre-wrap text-sm leading-relaxed text-togo-white">{overview}</p>
          ) : (
            <p className="text-sm italic text-togo-faint">
              {canEdit
                ? "No overview yet — a couple of sentences here saves everyone asking what this project is."
                : "No overview added yet."}
            </p>
          )
        ) : prdFile ? (
          <div className="flex flex-wrap items-center gap-3">
            <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-md bg-togo-blue-muted text-togo-blue">
              <FileText size={18} />
            </div>
            <div className="min-w-0">
              <p className="truncate text-sm font-semibold text-togo-white">{prdFile.name}</p>
              <p className="text-xs text-togo-faint">
                {[
                  prdFile.size != null ? formatBytes(prdFile.size) : null,
                  prdFile.uploadedAt ? `Uploaded ${formatDateLong(prdFile.uploadedAt)}` : null,
                ]
                  .filter(Boolean)
                  .join(" · ")}
              </p>
            </div>
            <div className="ml-auto flex shrink-0 items-center gap-2">
              <Button type="button" variant="secondary" size="sm" onClick={() => setPreviewOpen(true)}>
                Preview
              </Button>
              <a href={prdFile.url} target="_blank" rel="noreferrer">
                <Button type="button" variant="secondary" size="sm">
                  Download
                </Button>
              </a>
              {/* Removal was previously only reachable as an unlabelled × after
                  clicking "Edit PRD" — and it deleted on the first click. */}
              {canEdit && (
                <Button
                  type="button"
                  variant="secondary"
                  size="sm"
                  onClick={() => setRemoveConfirmOpen(true)}
                  disabled={uploading}
                  className="border-[var(--status-blocked-fg)] text-[var(--status-blocked-fg)] hover:bg-[var(--status-blocked-bg)]"
                >
                  <Trash2 size={14} /> Remove
                </Button>
              )}
            </div>
          </div>
        ) : prd ? (
          <pre className="max-h-[220px] overflow-y-auto whitespace-pre-wrap rounded border border-togo-border bg-togo-surface-2/40 p-3 font-mono text-xs leading-relaxed text-togo-muted">
            {prd}
          </pre>
        ) : (
          <p className="text-sm italic text-togo-faint">
            {canEdit ? "No PRD attached — upload a document or paste the requirements inline." : "No PRD attached."}
          </p>
        )}

        {error && (
          <p role="alert" className="mt-3 text-xs text-[var(--status-blocked-fg)]">
            {error}
          </p>
        )}
      </div>

      <ConfirmDialog
        open={removeConfirmOpen}
        title="Remove PRD file"
        description={`Remove “${prdFile?.name ?? "this file"}” from ${projectName}? The file is deleted from storage and can't be recovered — you'd need to upload it again.`}
        confirmLabel="Remove file"
        danger
        loading={uploading}
        onConfirm={handleRemoveFile}
        onCancel={() => setRemoveConfirmOpen(false)}
      />

      {prdFile && (
        <PrdPreviewModal
          open={previewOpen}
          onClose={() => setPreviewOpen(false)}
          fileName={prdFile.name}
          fileUrl={prdFile.url}
        />
      )}
    </section>
  );
}
