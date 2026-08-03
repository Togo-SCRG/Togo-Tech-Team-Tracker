"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Avatar } from "@/components/ui/Avatar";
import { ThemeToggle } from "@/components/ui/ThemeToggle";
import { ActiveTimerBar } from "@/components/timetracker/ActiveTimerBar";
import { MobileNav } from "@/components/layout/MobileNav";
import { NotificationBell } from "@/components/layout/NotificationBell";
import { EasternClock } from "@/components/layout/EasternClock";
import type { CurrentUser } from "@/types";

const PAGE_TITLES: { match: (p: string) => boolean; title: string }[] = [
  { match: (p) => p.startsWith("/dashboard"), title: "Dashboard" },
  { match: (p) => p.startsWith("/daily-updates"), title: "Daily Updates" },
  { match: (p) => p.startsWith("/projects"), title: "Projects" },
  { match: (p) => p.startsWith("/members"), title: "Team" },
  { match: (p) => p.startsWith("/notifications"), title: "Notifications" },
  { match: (p) => p.startsWith("/access"), title: "Access Levels" },
  { match: (p) => p.startsWith("/settings"), title: "Settings" },
];

export function Topbar({ user }: { user: CurrentUser | null }) {
  const pathname = usePathname();
  const title = PAGE_TITLES.find((p) => p.match(pathname))?.title ?? "";

  return (
    <header className="sticky top-0 z-20 flex items-center gap-3 border-b border-togo-border bg-togo-charcoal/80 px-4 py-3 backdrop-blur sm:px-6 md:px-8">
      {user && <MobileNav isAdmin={user.isAdmin} isSuperAdmin={user.isSuperAdmin} isClient={user.isClient} />}
      <div className="flex min-w-0 items-center gap-3">
        <h1 className="whitespace-nowrap text-base font-bold text-togo-white">{title}</h1>
        {/* No pill: it read as a control rather than a label sitting next to the
            page title. Plain muted text now, with the time beside the date. */}
        <EasternClock className="hidden whitespace-nowrap text-xs text-togo-muted sm:inline" />
      </div>
      <div className="flex-1" />
      {user && (
        <div className="flex shrink-0 items-center gap-2 sm:gap-3">
          <ActiveTimerBar />
          <NotificationBell />
          {/* The sidebar carries the labelled theme toggle on desktop; this one
              only exists for viewports where the sidebar is hidden. */}
          <div className="md:hidden">
            <ThemeToggle />
          </div>
          <Link
            href="/settings"
            title="Your profile and settings"
            className="flex items-center gap-2.5 rounded-md px-1 py-0.5 transition-colors hover:bg-togo-surface/60"
          >
            <div className="hidden text-right sm:block">
              <div className="text-sm font-bold leading-tight text-togo-white">{user.name}</div>
              <div className="text-[10px] uppercase tracking-wide text-togo-blue">{user.role}</div>
            </div>
            <Avatar name={user.name} avatarUrl={user.avatarUrl} size="sm" />
          </Link>
        </div>
      )}
    </header>
  );
}
