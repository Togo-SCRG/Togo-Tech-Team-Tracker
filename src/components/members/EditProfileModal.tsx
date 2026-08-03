"use client";

import { useEffect, useState } from "react";
import { Modal } from "@/components/ui/Modal";
import { Input, Textarea, Label } from "@/components/ui/Input";
import { Button } from "@/components/ui/Button";
import { AvatarUploadField } from "@/components/members/AvatarUploadField";
import { useToast } from "@/components/ui/Toast";
import type { MemberItem } from "@/types";

export function EditProfileModal({
  open,
  onClose,
  onSaved,
  member,
}: {
  open: boolean;
  onClose: () => void;
  onSaved: () => void;
  member: MemberItem;
}) {
  const toast = useToast();
  const [role, setRole] = useState(member.role);
  const [bio, setBio] = useState(member.bio || "");
  const [skills, setSkills] = useState(member.skills || "");
  const [githubUrl, setGithubUrl] = useState(member.githubUrl || "");
  const [phone, setPhone] = useState(member.phone || "");
  const [email, setEmail] = useState(member.email || "");
  const [avatarUrl, setAvatarUrl] = useState(member.avatarUrl || "");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Clients are stakeholders rather than contributors: they get a phone number
  // on their profile and have no use for skills or a GitHub link.
  const isClient = member.accessLevel === "client";

  useEffect(() => {
    setRole(member.role);
    setBio(member.bio || "");
    setSkills(member.skills || "");
    setGithubUrl(member.githubUrl || "");
    setPhone(member.phone || "");
    setEmail(member.email || "");
    setAvatarUrl(member.avatarUrl || "");
  }, [member, open]);

  const emailChanged = email.trim().toLowerCase() !== (member.email || "").toLowerCase();
  const emailInvalid = email.trim() !== "" && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim());

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    setError(null);

    const res = await fetch(`/api/members/${member.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        role,
        bio,
        avatarUrl,
        phone,
        // Only sent when actually changed — the server treats an email change
        // as a sign-in change and touches auth.users for it.
        ...(emailChanged ? { email: email.trim() } : {}),
        ...(isClient ? {} : { skills, githubUrl }),
      }),
    });

    if (!res.ok) {
      const data = await res.json();
      setError(data.error || "Failed to save profile.");
      setSaving(false);
      return;
    }

    onSaved();
    onClose();
    setSaving(false);
    // A changed sign-in address is worth calling out separately — it's the one
    // edit here that affects how this person logs in.
    toast.success(emailChanged ? "Profile saved — sign-in email updated." : "Profile saved.");
  }

  return (
    <Modal open={open} onClose={onClose} title="Edit Profile">
      <form onSubmit={handleSubmit} className="space-y-4">
        <AvatarUploadField memberId={member.id} name={member.name} avatarUrl={avatarUrl} onChange={setAvatarUrl} />
        <div>
          <Label htmlFor="edit-role" required>
            Role
          </Label>
          <Input id="edit-role" value={role} onChange={(e) => setRole(e.target.value)} required />
        </div>
        <div>
          <Label htmlFor="edit-bio" hint={isClient ? "Shown as the About section" : undefined}>
            Bio
          </Label>
          <Textarea
            id="edit-bio"
            rows={isClient ? 8 : 3}
            value={bio}
            onChange={(e) => setBio(e.target.value)}
            placeholder={isClient ? "Background, experience and focus at Togo." : undefined}
          />
        </div>
        <div>
          <Label htmlFor="edit-phone">Phone</Label>
          <Input
            id="edit-phone"
            value={phone}
            onChange={(e) => setPhone(e.target.value)}
            placeholder="(555) 123-4567"
            inputMode="tel"
          />
        </div>
        <div>
          <Label htmlFor="edit-email" hint="Also the sign-in address">
            Email
          </Label>
          <Input
            id="edit-email"
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="name@harnesstogo.com"
            autoComplete="email"
            aria-invalid={emailInvalid}
            aria-describedby={emailInvalid ? "edit-email-error" : emailChanged ? "edit-email-note" : undefined}
          />
          {emailInvalid ? (
            <p id="edit-email-error" className="mt-1.5 text-[11px] text-[var(--status-blocked-fg)]">
              That doesn&apos;t look like a valid email address.
            </p>
          ) : (
            emailChanged && (
              <p id="edit-email-note" className="mt-1.5 text-[11px] text-[var(--status-hold-fg)]">
                This changes the address {member.name.split(" ")[0]} signs in with, not just the one shown here.
              </p>
            )
          )}
        </div>

        {!isClient && (
          <>
            <div>
              <Label htmlFor="edit-skills" hint="Comma-separated">
                Skills
              </Label>
              <Input
                id="edit-skills"
                value={skills}
                onChange={(e) => setSkills(e.target.value)}
                placeholder="React, TypeScript, ..."
              />
            </div>
            <div>
              <Label htmlFor="edit-github">GitHub URL</Label>
              <Input
                id="edit-github"
                value={githubUrl}
                onChange={(e) => setGithubUrl(e.target.value)}
                placeholder="https://github.com/..."
              />
            </div>
          </>
        )}

        {error && (
          <p role="alert" className="text-sm text-[var(--status-blocked-fg)]">
            {error}
          </p>
        )}

        <div className="flex justify-end gap-3 pt-2">
          <Button type="button" variant="secondary" onClick={onClose} disabled={saving}>
            Cancel
          </Button>
          <Button type="submit" disabled={saving || emailInvalid}>
            {saving ? "Saving..." : "Save"}
          </Button>
        </div>
      </form>
    </Modal>
  );
}
