import Link from "next/link";
import {
  AlertTriangle,
  ArrowRight,
  ClipboardList,
  FolderKanban,
  Plus,
  Timer,
} from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import { capabilitiesFor } from "@/lib/permissions";
import type { AccessLevel } from "@/types";
import { STATUS_OPTIONS, statusHex, statusProgress } from "@/lib/utils";
import { fetchProjectBlockers } from "@/lib/projectBlockers";
import { StatusBadge } from "@/components/ui/StatusBadge";
import { Button } from "@/components/ui/Button";
import { Avatar } from "@/components/ui/Avatar";
import { EmptyState } from "@/components/ui/EmptyState";
import { ProgressBar } from "@/components/ui/ProgressBar";
import { RecentUpdatesPanel, type RecentUpdateRow } from "@/components/dashboard/RecentUpdatesPanel";
import { StatCards, type StatCard, type StatIcon, type StatItem } from "@/components/dashboard/StatCards";

function hoursLabel(minutes: number): string {
  if (!minutes) return "—";
  return `${(minutes / 60).toFixed(1)}h`;
}

export default async function DashboardPage() {
  const supabase = createClient();
  const now = new Date();
  const todayStr = now.toISOString().slice(0, 10);

  const {
    data: { user: viewer },
  } = await supabase.auth.getUser();
  const { data: viewerProfile } = viewer
    ? await supabase.from("profiles").select("access_level").eq("id", viewer.id).single()
    : { data: null };
  // Clients watch the team's work rather than adding to it, so the two
  // "log an update" calls to action don't apply to them.
  const canLogWork = viewerProfile?.access_level !== "client";

  // A plain user sees only their own work — the same rule /api/updates enforces.
  // Everything update-shaped on this page is scoped by it: the Updates tile, its
  // period counts, and the Recent updates panel.
  const viewerCaps = await capabilitiesFor(
    supabase,
    viewerProfile?.access_level as AccessLevel,
    viewer?.id
  );
  const seesEveryone = viewerCaps.includes("tracker.view.all");
  const ownId = viewer?.id ?? "";

  const [
    { data: todayUpdates },
    { data: recentUpdates },
    { data: allUpdates },
    { data: timeEntries },
    { data: projectSettings },
    { data: openBlockers },
    standaloneBlockers,
  ] = await Promise.all([
    // project/update/author as well as the status: the stat cards open a list of
    // what's behind each number, which a bare count can't provide.
    supabase
      .from("daily_updates")
      .select("id, status, user_id, project, update, profiles(name)")
      .eq("date", todayStr),
    supabase
      .from("daily_updates")
      .select("*, profiles(id, name, avatar_url, role)")
      .order("created_at", { ascending: false })
      .limit(50),
    supabase.from("daily_updates").select("project, status, date").order("date", { ascending: false }),
    supabase.from("time_entries").select("project, user_id, date, duration_minutes"),
    supabase.from("project_settings").select("project, status, weekly_hour_cap"),
    // Outstanding blockers, every project, every date — deliberately not
    // date-scoped like the three stats above. A blocker raised last week is
    // still blocking, so counting only today's reported "1 blocked task" while
    // listing older ones underneath.
    //
    // Matched on non-empty `blockers` text rather than status = 'Blocked',
    // because clearing that text is exactly what the Resolve button does — so
    // this is the same set the project pages show and the same set that shrinks
    // when someone resolves one.
    supabase
      .from("daily_updates")
      .select("id, project, blockers, date, profiles(name)")
      .not("blockers", "is", null)
      .neq("blockers", "")
      .order("date", { ascending: false }),
    // Blockers raised against a project directly (migration 038). Counted in the
    // same tile as the ones above — from the dashboard's point of view a blocker
    // is a blocker, whichever way it was raised.
    fetchProjectBlockers(supabase),
  ]);

  const today = todayUpdates || [];
  const todayVisible = today.filter((u) => seesEveryone || u.user_id === ownId);
  const total = todayVisible.length;
  // Whitespace-only text passes the SQL filter but isn't a real blocker.
  // Standalone project blockers are folded in and shaped to match, so everything
  // downstream — the count, the tile's list, the banner — reads one array.
  const blockers = [
    ...standaloneBlockers.map((b) => ({
      id: b.id,
      project: b.project,
      blockers: b.blockers,
      date: b.date,
      profiles: { name: b.userName },
    })),
    ...(openBlockers || []).filter((b) => (b.blockers as string | null)?.trim()),
  ].sort((a, b) => (b.date as string).localeCompare(a.date as string));
  const blocked = blockers.length;
  const blockedProjectCount = new Set(blockers.map((b) => b.project as string)).size;

  // Minutes per (user, project). This was keyed on (user, project, *date*),
  // which only matched when someone logged time on a project on the exact day
  // they also wrote the update — so the Hrs column was almost always "—" even
  // for projects with hours against them. Dropping the date makes it "what this
  // person has logged on this project", which is what the column reads as.
  const minutesByKey = new Map<string, number>();
  let totalMinutesToday = 0;
  for (const t of timeEntries || []) {
    const key = `${t.user_id}|${t.project}`;
    minutesByKey.set(key, (minutesByKey.get(key) || 0) + t.duration_minutes);
    if (t.date === todayStr) totalMinutesToday += t.duration_minutes;
  }

  // Active projects: canonical status from project_settings when set,
  // otherwise the latest daily-update status. Most-recently-active first.
  const settingsByProject = new Map((projectSettings || []).map((p) => [p.project, p]));
  const projectAgg = new Map<string, { status: string; lastActivity: string }>();
  for (const u of allUpdates || []) {
    if (!projectAgg.has(u.project)) projectAgg.set(u.project, { status: u.status, lastActivity: u.date });
  }
  for (const ps of projectSettings || []) {
    if (!projectAgg.has(ps.project)) projectAgg.set(ps.project, { status: ps.status || "Not Started", lastActivity: "" });
  }
  const activeProjects = Array.from(projectAgg.entries())
    .map(([name, d]) => ({ name, status: settingsByProject.get(name)?.status || d.status, lastActivity: d.lastActivity }))
    .sort((a, b) => b.lastActivity.localeCompare(a.lastActivity));

  // Every status gets a card, generated from STATUS_OPTIONS rather than listed
  // by hand — adding a status (Review, recently) should show up here without
  // anyone remembering to come back and add a tile.
  //
  // These count *projects*, using each project's own status: a project
  // half-finished for a week is one in-progress project, however many updates
  // were logged against it.
  const projectItems = (list: typeof activeProjects): StatItem[] =>
    list.map((p) => ({ id: p.name, project: p.name, status: p.status, date: p.lastActivity || undefined }));

  const STATUS_ICON: Record<string, StatIcon> = {
    "Not Started": "not-started",
    "In Progress": "progress",
    Review: "review",
    Completed: "completed",
    "On Hold": "hold",
    Blocked: "blocked",
  };

  const statusCards: StatCard[] = STATUS_OPTIONS.map((status) => {
    const matching = activeProjects.filter((p) => p.status === status);
    return {
      key: `status-${status}`,
      label: status,
      value: matching.length,
      color: statusHex(status),
      icon: STATUS_ICON[status] ?? "updates",
      note: `${matching.length} ${status.toLowerCase()} project${matching.length === 1 ? "" : "s"}`,
      items: projectItems(matching),
      kind: "projects" as const,
      emptyLabel: `No ${status.toLowerCase()} projects`,
      detail: `Projects whose status is ${status}.`,
    };
  });

  // Scoped for a plain user: their dashboard shows their own updates, not the
  // team's. The rows were already fetched unfiltered for the counts above, so
  // this is a filter rather than a second query.
  const visibleRecent = (recentUpdates || []).filter((u) => seesEveryone || u.user_id === ownId);

  const statCards: StatCard[] = [
    {
      // The status tiles that follow each count one slice of this number, so it
      // reads as their total. Openable by everyone: unlike the update list this
      // replaced, the project list isn't scoped to the viewer.
      key: "total-projects",
      label: "Total projects",
      value: activeProjects.length,
      color: "var(--togo-white)",
      icon: "projects",
      note: `${activeProjects.length} project${activeProjects.length === 1 ? "" : "s"} in the hub`,
      items: projectItems(activeProjects),
      kind: "projects",
      emptyLabel: "No projects yet",
      detail: "Every project in the hub, newest activity first.",
    },
    ...statusCards,
    {
      // Distinct from the "Blocked" card above: that counts projects whose
      // status is Blocked, this counts individual unresolved blockers, which a
      // project can have several of while sitting at any status.
      key: "blockers",
      label: "Blockers",
      value: blocked,
      color: statusHex("Blocked"),
      icon: "blockers",
      note:
        blocked > 0
          ? `Across ${blockedProjectCount} project${blockedProjectCount === 1 ? "" : "s"}`
          : "None outstanding",
      items: blockers.map((b) => ({
        id: b.id as string,
        project: b.project as string,
        text: (b.blockers as string) ?? null,
        authorName: (b.profiles as { name?: string } | null)?.name || "Someone",
        date: b.date as string,
      })),
      kind: "blockers",
      emptyLabel: "No blockers — nothing is held up",
      detail: "Every unresolved blocker and the project it's holding up — not just today's.",
    },
  ];




  const recentUpdateRows: RecentUpdateRow[] = visibleRecent.map((u) => ({
    id: u.id,
    project: u.project,
    update: u.update,
    status: u.status,
    authorName: u.profiles?.name ?? null,
    authorAvatarUrl: u.profiles?.avatar_url ?? null,
    hours: hoursLabel(minutesByKey.get(`${u.user_id}|${u.project}`) || 0),
  }));

  return (
    <div className="space-y-4">
      {/* Primary actions sit at the top — they were previously below the fold. */}
      <div className="flex flex-wrap items-center gap-2">
        <div className="text-xs text-togo-faint">
          {total > 0 ? (
            <span className="tnum">
              <span className="font-semibold text-togo-muted">{total}</span> update{total === 1 ? "" : "s"} logged today
              {totalMinutesToday > 0 && (
                <>
                  {" · "}
                  <span className="font-semibold text-togo-muted">{(totalMinutesToday / 60).toFixed(1)}h</span> tracked
                </>
              )}
            </span>
          ) : (
            "Nothing logged today yet."
          )}
        </div>
        <div className="ml-auto flex items-center gap-2">
          <Link href="/projects">
            <Button variant="secondary" size="sm">
              <Timer size={14} /> Track time
            </Button>
          </Link>
          {canLogWork && (
            <Link href="/daily-updates?logUpdate=1">
              <Button size="sm">
                <Plus size={14} /> Log update
              </Button>
            </Link>
          )}
        </div>
      </div>

      {/* Blocked work is the one thing that needs chasing — surface it up front. */}
      {blocked > 0 && (
        <Link
          href="/daily-updates"
          className="flex items-start gap-2.5 rounded-md border border-[var(--status-blocked-border)] bg-[var(--status-blocked-bg)] px-4 py-3 transition-opacity hover:opacity-90"
        >
          <AlertTriangle size={16} className="mt-0.5 shrink-0 text-[var(--status-blocked-fg)]" />
          <div className="min-w-0 flex-1">
            <p className="text-sm font-semibold text-[var(--status-blocked-fg)]">
              {blocked} blocked {blocked === 1 ? "task needs" : "tasks need"} attention
            </p>
            {blockers.length > 0 && (
              <p className="mt-0.5 truncate text-xs text-togo-muted">
                {blockers
                  .slice(0, 2)
                  .map((b) => `${b.project}: ${(b.blockers as string).trim()}`)
                  .join(" · ")}
                {blockers.length > 2 && ` · +${blockers.length - 2} more`}
              </p>
            )}
          </div>
          <ArrowRight size={14} className="mt-0.5 shrink-0 text-[var(--status-blocked-fg)]" />
        </Link>
      )}

      <StatCards cards={statCards} />

      {/* The sidebar column was 320px, which squeezed each "Active projects"
          row into name + bar + % + badge with nothing to spare, and truncated
          the activity lines. 400px gives both room without starving the
          updates table, which keeps ~740px at max-w-6xl. */}
      {/* No items-start: the grid stretches both columns to the same height, so
          Active projects ends level with the updates table rather than being
          measured in pixels against it. */}
      <div className="grid grid-cols-1 gap-3 lg:grid-cols-[1fr_400px]">
        {/* Recent updates */}
        <div className="rounded-md border border-togo-border bg-togo-surface">
          <div className="flex items-center justify-between border-b border-togo-border px-4 py-2.5">
            <span className="text-xs font-medium text-togo-muted">Recent updates</span>
            <Link
              href="/daily-updates"
              className="flex items-center gap-1 text-[11px] text-togo-faint transition-colors hover:text-togo-blue"
            >
              View all <ArrowRight size={11} />
            </Link>
          </div>

          {!recentUpdates || recentUpdates.length === 0 ? (
            <EmptyState
              icon={ClipboardList}
              title="No updates logged yet"
              description="Once the team starts logging daily updates, the most recent ones show up here."
              action={
                canLogWork ? (
                  <Link href="/daily-updates?logUpdate=1">
                    <Button size="sm">
                      <Plus size={14} /> Log the first update
                    </Button>
                  </Link>
                ) : undefined
              }
              className="border-0 bg-transparent"
            />
          ) : (
            <RecentUpdatesPanel rows={recentUpdateRows} />
          )}
        </div>

        {/* Right column */}
        <div className="flex flex-col">
          <div className="flex h-full flex-col overflow-hidden rounded-md border border-togo-border bg-togo-surface">
            <div className="flex items-center justify-between border-b border-togo-border px-4 py-2.5">
              <span className="text-xs font-medium text-togo-muted">Active projects</span>
              <Link
                href="/projects"
                className="flex items-center gap-1 text-[11px] text-togo-faint transition-colors hover:text-togo-blue"
              >
                All <ArrowRight size={11} />
              </Link>
            </div>
            {/* flex-1 + min-h-0: the list takes the rest of the column, however
                tall the updates table beside it turns out to be, and scrolls
                once there are more projects than fit. min-h-0 is what lets a
                flex child shrink below its content height. */}
            <div className="min-h-0 flex-1 overflow-y-auto">
              {activeProjects.length === 0 ? (
                <EmptyState
                  icon={FolderKanban}
                  title="No projects yet"
                  description="Projects appear here as soon as work is logged against them."
                  className="h-full justify-center border-0 bg-transparent px-4 py-8"
                />
              ) : (
                activeProjects.map((p) => (
                  <Link
                    key={p.name}
                    href={`/projects/${encodeURIComponent(p.name)}`}
                    className="flex items-center gap-2 border-t border-togo-border px-4 py-2 transition-colors hover:bg-[var(--togo-hover)]"
                  >
                    <span className="flex-1 truncate text-xs text-togo-white" title={p.name}>
                      {p.name}
                    </span>
                    <ProgressBar
                      value={statusProgress(p.status)}
                      color={statusHex(p.status)}
                      label={`${p.name}: ${p.status}`}
                      className="h-1.5 w-20 shrink-0"
                    />
                    <span className="tnum w-7 shrink-0 text-right text-[10px] text-togo-faint">
                      {statusProgress(p.status)}%
                    </span>
                    <StatusBadge status={p.status} />
                  </Link>
                ))
              )}
            </div>
          </div>

        </div>
      </div>
    </div>
  );
}
