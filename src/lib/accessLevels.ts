import type { AccessLevel } from "@/types";

// Ordered most to least privileged — the Access Levels page renders in this
// order, and "client" sits between admin and user because it's a stakeholder
// tier, not because it can do more than a user. In write terms it can do less.
export const ACCESS_LEVEL_LABELS: Record<AccessLevel, string> = {
  super_admin: "Super admin",
  admin: "Admin",
  client: "Client",
  user: "User",
};

export const ACCESS_LEVEL_HINTS: Record<AccessLevel, string> = {
  super_admin: "Full control, including access levels",
  admin: "Manage projects and log updates for anyone",
  client: "Read-only — can watch progress but not change anything",
  user: "Log their own updates and time",
};

export const ACCESS_LEVEL_ORDER: AccessLevel[] = ["super_admin", "admin", "client", "user"];

/**
 * Which tiers a given caller may grant when inviting someone.
 *
 * A plain user can't invite at all, and an admin can't create a super admin —
 * that would let them escalate their own effective privileges by proxy. Shared
 * by the invite API and the invite form so the two can't disagree about what's
 * allowed; the API is the one that actually enforces it.
 */
export function invitableLevels(callerLevel: AccessLevel | null | undefined): AccessLevel[] {
  if (callerLevel === "super_admin") return ["super_admin", "admin", "client", "user"];
  // An admin may create a client: it grants strictly less than the 'user' tier
  // they can already grant, so it's no escalation path.
  if (callerLevel === "admin") return ["admin", "client", "user"];
  // A client may bring in another client — a stakeholder introducing a
  // colleague to watch alongside them. Their own tier only, so it can't be
  // used to mint an account with more access than the person creating it.
  if (callerLevel === "client") return ["client"];
  return [];
}

export function canInvite(callerLevel: AccessLevel | null | undefined): boolean {
  return invitableLevels(callerLevel).length > 0;
}
