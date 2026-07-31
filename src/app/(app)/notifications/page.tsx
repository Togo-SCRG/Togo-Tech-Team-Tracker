"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import Link from "next/link";
import {
  Archive,
  ArchiveRestore,
  Bell,
  BellOff,
  Check,
  CheckCheck,
  CheckSquare,
  Inbox,
  SlidersHorizontal,
  Square,
  Trash2,
} from "lucide-react";
import { Avatar } from "@/components/ui/Avatar";
import { Button } from "@/components/ui/Button";
import { EmptyState } from "@/components/ui/EmptyState";
import { Skeleton } from "@/components/ui/Skeleton";
import { useToast } from "@/components/ui/Toast";
import { cn, formatDateShort, timeAgo } from "@/lib/utils";
import { notificationVisual } from "@/lib/notificationDisplay";
import {
  fetchNotifications,
  markAllSeen,
  setUnreadCount,
  type NotificationFilter,
  type NotificationItem,
} from "@/lib/useUnreadNotifications";

const TABS: { key: NotificationFilter; label: string }[] = [
  { key: "all", label: "All" },
  { key: "unread", label: "Unread" },
  { key: "archived", label: "Archived" },
];

// The tabs cover read state, so the only other axis worth filtering on is what
// actually happened. Applied client-side — the list is already capped at 50.
type TypeFilter = "all" | "project_assigned" | "project_removed" | "project_created";

const TYPE_FILTERS: { key: TypeFilter; label: string }[] = [
  { key: "all", label: "All activity" },
  { key: "project_assigned", label: "Added to a project" },
  { key: "project_removed", label: "Removed from a project" },
  { key: "project_created", label: "New projects" },
];

export default function NotificationsPage() {
  const toast = useToast();
  const [tab, setTab] = useState<NotificationFilter>("all");
  const [items, setItems] = useState<NotificationItem[]>([]);
  const [unread, setUnread] = useState(0);
  const [archivedCount, setArchivedCount] = useState(0);
  const [loading, setLoading] = useState(true);
  const [busyId, setBusyId] = useState<string | null>(null);
  const [marking, setMarking] = useState(false);
  const [typeFilter, setTypeFilter] = useState<TypeFilter>("all");
  const [filterOpen, setFilterOpen] = useState(false);
  const filterRef = useRef<HTMLDivElement>(null);

  // Close the filter menu on outside click and Escape.
  useEffect(() => {
    if (!filterOpen) return;
    function onClick(e: MouseEvent) {
      if (filterRef.current && !filterRef.current.contains(e.target as Node)) setFilterOpen(false);
    }
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") setFilterOpen(false);
    }
    document.addEventListener("mousedown", onClick);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("mousedown", onClick);
      document.removeEventListener("keydown", onKey);
    };
  }, [filterOpen]);

  const load = useCallback(async (filter: NotificationFilter) => {
    const data = await fetchNotifications(filter);
    setItems(data.notifications);
    setUnread(data.unreadCount);
    setArchivedCount(data.archivedCount);
    setLoading(false);
  }, []);

  useEffect(() => {
    setLoading(true);
    load(tab);
  }, [tab, load]);

  // Being on this page counts as having looked, however you got here — a
  // bookmark, a refresh, or a link from a notification. Runs once on mount
  // rather than per tab, so switching tabs doesn't re-post.
  useEffect(() => {
    markAllSeen();
  }, []);

  async function markAllRead() {
    setMarking(true);
    const stamp = new Date().toISOString();
    // Optimistic, and the shared count is published so the sidebar badge and
    // topbar bell clear at the same moment rather than on next navigation.
    setItems((prev) => prev.map((n) => ({ ...n, readAt: n.readAt ?? stamp })));
    setUnread(0);
    setUnreadCount(0);

    const res = await fetch("/api/notifications", { method: "PATCH" });
    if (!res.ok) {
      toast.error("Couldn't mark those as read. Please try again.");
      await load(tab);
    }
    setMarking(false);
  }

  async function act(n: NotificationItem, body: { read?: boolean; archived?: boolean }) {
    setBusyId(n.id);
    const res = await fetch(`/api/notifications/${n.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });
    if (!res.ok) toast.error("That didn't work. Please try again.");
    // Reloading rather than patching in place: archiving moves a row between
    // tabs, and the counts have to come from the server anyway.
    await load(tab);
    setBusyId(null);
  }

  /**
   * Opening a notification is what marks that one read — the badge is already
   * gone by this point (that's "seen"), but each item stays unread until it's
   * actually been looked at. Optimistic, and fire-and-forget because we're
   * navigating away: client-side routing keeps the JS context alive, so the
   * request still completes.
   */
  function markOneRead(n: NotificationItem) {
    if (n.readAt) return;
    setItems((prev) => prev.map((x) => (x.id === n.id ? { ...x, readAt: new Date().toISOString() } : x)));
    setUnread((u) => Math.max(0, u - 1));
    fetch(`/api/notifications/${n.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ read: true }),
    }).catch(() => {});
  }

  async function remove(n: NotificationItem) {
    setBusyId(n.id);
    const res = await fetch(`/api/notifications/${n.id}`, { method: "DELETE" });
    if (res.ok) toast.success("Notification deleted.");
    else toast.error("Couldn't delete that. Please try again.");
    await load(tab);
    setBusyId(null);
  }

  const now = new Date();
  const visible = typeFilter === "all" ? items : items.filter((n) => n.type === typeFilter);
  const filteredOut = items.length - visible.length;

  return (
    <div className="space-y-4">
      {/* Controls share the tab row: they act on what the tabs are showing, and
          a separate row above them left a band of empty space where the page
          title used to be. */}
      <div className="flex flex-wrap items-end justify-between gap-2 border-b border-togo-border">
        <div role="tablist" aria-label="Filter notifications" className="flex gap-1">
          {TABS.map((t) => {
            const count = t.key === "unread" ? unread : t.key === "archived" ? archivedCount : 0;
            const active = tab === t.key;
            return (
              <button
                key={t.key}
                role="tab"
                aria-selected={active}
                onClick={() => setTab(t.key)}
                className={cn(
                  "-mb-px flex items-center gap-1.5 border-b-2 px-3 py-2 text-sm font-medium transition-colors",
                  active ? "border-togo-blue text-togo-white" : "border-transparent text-togo-muted hover:text-togo-white"
                )}
              >
                {t.label}
                {count > 0 && (
                  <span
                    className={cn(
                      "tnum rounded-full px-1.5 py-0.5 text-[10px] font-bold leading-none",
                      t.key === "unread"
                        ? "bg-[var(--status-blocked-fg)] text-white"
                        : "bg-togo-surface-2 text-togo-muted"
                    )}
                  >
                    {count}
                  </span>
                )}
              </button>
            );
          })}
        </div>

        {/* mb-1.5 so the buttons sit clear of the tabs' underline rather than
            colliding with it. */}
        <div className="mb-1.5 flex items-center gap-2">
          {/* Always present rather than appearing only when something's unread —
              a control that comes and goes is harder to find than one that's
              simply disabled. */}
          <Button
            size="sm"
            variant="secondary"
            onClick={markAllRead}
            disabled={marking || unread === 0}
            title={unread === 0 ? "Nothing unread" : `Mark ${unread} as read`}
          >
            <CheckCheck size={14} /> {marking ? "Marking..." : "Mark all as read"}
          </Button>

          <div ref={filterRef} className="relative">
            <button
              onClick={() => setFilterOpen((v) => !v)}
              aria-label="Filter notifications"
              aria-expanded={filterOpen}
              title="Filter by type"
              className={cn(
                "rounded-md border p-2 transition-colors",
                typeFilter === "all"
                  ? "border-togo-border text-togo-muted hover:border-togo-blue hover:text-togo-blue"
                  : "border-togo-blue bg-togo-blue/10 text-togo-blue"
              )}
            >
              <SlidersHorizontal size={15} />
            </button>

            {filterOpen && (
              <div className="animate-fade-in absolute right-0 z-40 mt-2 w-52 overflow-hidden rounded-md border border-togo-border bg-togo-surface shadow-[var(--shadow-modal)]">
                <p className="border-b border-togo-border px-3 py-2 text-[10px] font-bold uppercase tracking-widest text-togo-faint">
                  Type
                </p>
                {TYPE_FILTERS.map((t) => (
                  <button
                    key={t.key}
                    onClick={() => {
                      setTypeFilter(t.key);
                      setFilterOpen(false);
                    }}
                    className={cn(
                      "flex w-full items-center gap-2 px-3 py-2 text-left text-xs transition-colors hover:bg-[var(--togo-hover)]",
                      typeFilter === t.key ? "text-togo-blue" : "text-togo-muted"
                    )}
                  >
                    <span className="flex w-3.5 justify-center">
                      {typeFilter === t.key && <Check size={12} />}
                    </span>
                    {t.label}
                  </button>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>

      {loading ? (
        <div className="space-y-2" role="status" aria-busy="true" aria-label="Loading notifications">
          <Skeleton className="h-16 rounded-md" />
          <Skeleton className="h-16 rounded-md" />
          <Skeleton className="h-16 rounded-md" />
        </div>
      ) : visible.length === 0 ? (
        // Distinguishes "the tab is empty" from "your type filter hid
        // everything" — the fix for each is different.
        filteredOut > 0 ? (
          <EmptyState
            icon={SlidersHorizontal}
            title="Nothing of that type here"
            description={`${filteredOut} ${filteredOut === 1 ? "notification is" : "notifications are"} hidden by the type filter.`}
            action={
              <Button size="sm" variant="secondary" onClick={() => setTypeFilter("all")}>
                Show all activity
              </Button>
            }
          />
        ) : (
          <EmptyState
            icon={tab === "archived" ? Archive : tab === "unread" ? BellOff : Bell}
            title={
              tab === "archived"
                ? "Nothing archived"
                : tab === "unread"
                ? "You're all caught up"
                : "No notifications yet"
            }
            description={
              tab === "archived"
                ? "Notifications you archive are kept here rather than deleted."
                : tab === "unread"
                ? "Every notification has been read."
                : "New projects, and being added to or taken off one, all show up here."
            }
          />
        )
      ) : (
        <ul className="overflow-hidden rounded-md border border-togo-border bg-togo-surface">
          {visible.map((n) => {
            const { verb, icon: TypeIcon, badgeClass, systemGenerated } = notificationVisual(n.type);
            const isBusy = busyId === n.id;
            const isArchived = !!n.archivedAt;
            return (
              <li
                key={n.id}
                className={cn(
                  "group flex items-center gap-2 border-b border-togo-border px-3 py-3 transition-colors last:border-b-0 hover:bg-[var(--togo-hover)]",
                  !n.readAt && "bg-[var(--status-blocked-fg)]/[0.04]",
                  isBusy && "opacity-50"
                )}
              >
                {/* The whole body is the click target — a single project name is
                    a small thing to hit. The action buttons sit outside this
                    link so they don't navigate. */}
                <Link
                  href={`/projects/${encodeURIComponent(n.project)}`}
                  onClick={() => markOneRead(n)}
                  className="flex min-w-0 flex-1 items-center gap-3"
                >
                  {/* Unread marker keeps its own column so rows stay aligned
                      whether or not the dot is there. */}
                  <span className="flex w-2 shrink-0 justify-center">
                    {!n.readAt && <span aria-label="Unread" className="h-2 w-2 rounded-full bg-togo-blue" />}
                  </span>

                  <span className="relative shrink-0">
                    <Avatar name={n.actorName || "?"} avatarUrl={n.actorAvatarUrl} size="sm" />
                    {/* Says at a glance what kind of event this was, without
                        having to read the sentence. */}
                    <span
                      className={cn(
                        "absolute -bottom-0.5 -right-0.5 flex h-3.5 w-3.5 items-center justify-center rounded-full ring-2 ring-togo-surface",
                        badgeClass
                      )}
                    >
                      <TypeIcon size={9} className="text-white" />
                    </span>
                  </span>

                  <span className="min-w-0 flex-1">
                    <span className="block text-sm leading-snug text-togo-white">
                      {systemGenerated ? (
                        <>
                          <span className="font-medium text-togo-blue">{n.project}</span>{" "}
                          <span className="text-togo-muted">{verb} — mark it complete or extend the timeline</span>
                        </>
                      ) : (
                        <>
                          <span className="font-semibold">{n.actorName || "Someone"}</span> {verb}{" "}
                          <span className="font-medium text-togo-blue">{n.project}</span>
                          {n.role && n.type === "project_assigned" && (
                            <span className="text-togo-muted"> as {n.role}</span>
                          )}
                        </>
                      )}
                    </span>
                    <span className="tnum mt-0.5 block text-[11px] text-togo-faint">
                      {timeAgo(n.createdAt, now)} · {formatDateShort(n.createdAt)}
                    </span>
                  </span>
                </Link>

                {/* Revealed on hover on a pointer device, but always present for
                    keyboard and touch — hiding them outright would strand them. */}
                <div className="flex shrink-0 items-center gap-0.5 opacity-60 transition-opacity focus-within:opacity-100 group-hover:opacity-100">
                  <button
                    onClick={() => act(n, { read: !n.readAt })}
                    disabled={isBusy}
                    title={n.readAt ? "Mark as unread" : "Mark as read"}
                    aria-label={n.readAt ? "Mark as unread" : "Mark as read"}
                    className="rounded p-1.5 text-togo-faint transition-colors hover:bg-togo-surface-2 hover:text-togo-blue disabled:opacity-50"
                  >
                    {n.readAt ? <Square size={15} /> : <CheckSquare size={15} />}
                  </button>
                  <button
                    onClick={() => act(n, { archived: !isArchived })}
                    disabled={isBusy}
                    title={isArchived ? "Move back to inbox" : "Archive"}
                    aria-label={isArchived ? "Move back to inbox" : "Archive"}
                    className="rounded p-1.5 text-togo-faint transition-colors hover:bg-togo-surface-2 hover:text-togo-blue disabled:opacity-50"
                  >
                    {isArchived ? <ArchiveRestore size={15} /> : <Inbox size={15} />}
                  </button>
                  <button
                    onClick={() => remove(n)}
                    disabled={isBusy}
                    title="Delete"
                    aria-label="Delete"
                    className="rounded p-1.5 text-[var(--status-blocked-fg)] transition-colors hover:bg-[var(--status-blocked-bg)] disabled:opacity-50"
                  >
                    <Trash2 size={15} />
                  </button>
                </div>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}
