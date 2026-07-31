import { AlertTriangle, FolderPlus, Minus, Plus, type LucideIcon } from "lucide-react";

/**
 * How each notification type reads and looks. Shared by the topbar bell and the
 * notifications page — they render the same three types, and duplicating the
 * branching in both is how the two end up disagreeing.
 */
export interface NotificationVisual {
  /** Slots between the actor's name and the project. */
  verb: string;
  /** Small overlay on the actor's avatar. */
  icon: LucideIcon;
  /** Background for that overlay. */
  badgeClass: string;
  /** True when the project name shouldn't read as "you were added". */
  aboutSomeoneElse: boolean;
  /** System-generated — there's no person to name, so the sentence leads with
   *  the project instead of an actor. */
  systemGenerated?: boolean;
}

export function notificationVisual(type: string): NotificationVisual {
  switch (type) {
    case "project_removed":
      return {
        verb: "removed you from",
        icon: Minus,
        badgeClass: "bg-[var(--status-blocked-fg)]",
        aboutSomeoneElse: false,
      };
    case "project_overdue":
      return {
        verb: "is overdue",
        icon: AlertTriangle,
        badgeClass: "bg-[var(--status-blocked-fg)]",
        aboutSomeoneElse: true,
        systemGenerated: true,
      };
    case "project_created":
      return {
        verb: "created",
        icon: FolderPlus,
        badgeClass: "bg-togo-blue",
        aboutSomeoneElse: true,
      };
    default:
      return {
        verb: "added you to",
        icon: Plus,
        badgeClass: "bg-[var(--status-completed-fg)]",
        aboutSomeoneElse: false,
      };
  }
}
