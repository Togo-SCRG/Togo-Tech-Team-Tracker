# Togo Tech Hub

An internal productivity tracker for the Togo tech team: daily updates, time tracking, project
oversight, and a permission system the super admin manages from the UI.

## Tech stack

- Next.js 14 (App Router) + TypeScript + Tailwind CSS
- Next.js API routes
- Supabase (Postgres + Auth + Storage) via `@supabase/supabase-js` and `@supabase/ssr`
- Authorization enforced in Postgres by Row Level Security — not in application code

## Setup

1. **Create a Supabase project** and apply the SQL migrations in order, in the SQL Editor. See
   [Database migrations](#database-migrations) below.

2. **Configure environment variables.** Copy `.env.local.example` to `.env.local` and fill in the
   values from your project's Settings → API:

   ```
   NEXT_PUBLIC_SUPABASE_URL=https://<your-project-ref>.supabase.co
   NEXT_PUBLIC_SUPABASE_ANON_KEY=your_anon_key_here
   SUPABASE_SERVICE_ROLE_KEY=your_service_role_key_here
   ```

   `SUPABASE_SERVICE_ROLE_KEY` bypasses Row Level Security. It is only ever read server-side, and only
   by the handful of routes listed under [How authorization works](#how-authorization-works). Never
   expose it to the browser or commit it.

3. **Install and run.**

   ```bash
   npm install
   npm run dev
   ```

The app runs at [http://localhost:3000](http://localhost:3000). For deploying to Vercel, see
[`DEPLOYMENT.md`](DEPLOYMENT.md).

### First account

There are no default credentials. Create the first user in the Supabase dashboard under
**Authentication → Users**, then promote that profile to super admin:

```sql
update public.profiles set access_level = 'super_admin' where email = 'you@example.com';
```

After that, accounts are created inside the app — Team → **Add member** / **Add Client**, or Access
Levels → **New user**. Each generates a password and shows it once; nothing is emailed.

## Access levels

Four tiers. The powers listed are the seeded **defaults** — the super admin can change any of them
from the UI (see [Permissions](#permissions)).

| Tier | By default |
|---|---|
| **Super admin** | Everything, including permissions and access levels. Never restricted. |
| **Admin** | Manage any project and its hour cap. Own updates only. Create and delete projects. Sees every member's updates. |
| **Client** | A stakeholder. Watches every project and can set status, timeline, overview and cap. Creates projects and other client accounts. Cannot log updates or track time. |
| **User** | Logs their own updates and time. Creates projects but can't delete them. Sets status and timeline on projects they're on. Sees only their own updates. |

## Features

### Dashboard

- A KPI tile per project status — Not Started, In Progress, Review, Completed, On Hold, Blocked —
  generated from the status list, so adding a status adds a tile. Each counts **projects** by their own
  status and opens a modal listing them.
- An **Updates** tile with a `1D / 1W / 1M / 1Y` period selector, and a **Blockers** tile listing every
  unresolved blocker with the project it's holding up.
- **Recent updates** — paginated, ten per page.
- **Active projects** — most recently active first, with a status-derived progress bar.
- A plain user's dashboard is scoped to their own updates, matching the tracker.

### Daily Updates (`/daily-updates`)

Table and card views of daily updates, with status pills, an engineer filter, date presets and a custom
range, search, column visibility, sorting, pagination, and Excel export.

- **All updates / My updates** tabs for admins and the super admin. Other tiers see the toolbar unchanged.
- **Log update** always records your own work; **Log member update** appears only for someone permitted
  to log on another person's behalf.
- The status field is the *project's* status — read from the project when you pick one, and writing it
  moves the project.
- Bullet text entered in the form renders as a real list, capped at two lines per row. Clicking a row
  opens the editor if you may change it, or a read-only detail view if not.

### Projects (`/projects`, `/projects/[name]`)

Projects aren't a table — the hub rolls up every project name found across daily updates, time entries,
assignments, and project settings.

- **All projects / My projects** tabs, status filters, search, columns, pagination.
- **Bulk selection** — set status or timeline across many projects at once, or delete them, with each
  action gated on the matching permission. A plain user gets checkboxes only under My projects, since
  their edits are limited to projects they're on.
- **Timeline** — free text ("End of Q3") or a date from the calendar picker. An unfinished project past
  its timeline shows red, and everyone is notified once.
- **Overview & PRD** — inline text or an uploaded file, stored in a private Storage bucket and served
  through short-lived signed URLs.
- **Weekly hour cap** — an optional budget with a progress bar, edited in a modal.
- **Blockers** — a count on the project header; raising, editing and resolving happen in a modal.
- **Time tracking** — a timer locked to the project plus manual entries, an entries table, and Excel
  export. A running timer stays visible and stoppable from the topbar anywhere in the app.

### Team (`/members`, `/members/[id]`)

Table and card views of the team, with **Active / Pending** tabs — pending being an account created but
never signed into. Pending accounts are excluded from every picker and filter, so work can't be assigned
to an account nobody has opened.

Featured clients get a profile showing their biography and contact details rather than activity and
project tabs.

### Notifications

An in-app bell in the topbar with an unread badge, and a full page at `/notifications` with
All / Unread / Archived tabs, per-row read/archive/delete, and a type filter. Notifications are raised
when someone is assigned to a project, when a project is created (including implicitly, by logging an
update against a new name), and when a project passes its timeline unfinished.

### Permissions

**Access Levels** (`/access`) shows what each tier can do and which tier every member is on. For the
super admin it also shows:

- A **permission matrix** — 17 capabilities × 4 tiers, as checkboxes. Ticking one changes what the
  database allows, not just what the UI shows.
- **Per-person exceptions** — Allow / Inherit / Deny for one individual, overriding their tier in either
  direction. So a single admin can be trusted to log for the team without promoting the whole tier.

Two rules stay in code deliberately, because they're what keep the rest trustworthy: nobody can create
an account above their own tier, and only the super admin can edit permissions. The super admin always
holds every capability, so no combination of checkboxes can lock you out of the page that fixes them.

### Settings (`/settings`)

Profile (name, role, bio, skills, GitHub, email, phone, avatar upload), password change, theme, and sign
out.

## Database migrations

The `supabase/` directory is **not** tracked in this repository — the migrations are applied by hand in
the Supabase SQL Editor and kept alongside the project locally. Run them in numeric order on a new
database; each file's header comment states what it does and which file it expects to follow.

Broadly: `001` creates the schema and RLS policies, `002` seeds data, `003`–`011` add time tracking and
project details, `012`–`018` add access levels and invitations, `019`–`027` add notifications, project
status and timelines, `028`–`031` introduce the client tier, and `032`–`035` replace the hardcoded tier
checks with the permission matrix.

`supabase/check_schema_state.sql` is a read-only diagnostic: paste it into the SQL Editor and it reports
which expected functions, tables and columns are missing, which tells you whether a migration was
skipped.

## Project structure

```
src/app/(app)/          authenticated pages — dashboard, tracker, projects, members, notifications,
                        access, settings — sharing the sidebar/topbar layout
src/app/api/            REST routes: auth, updates, time-entries, members, clients, users,
                        member-projects, project-settings, project-files, projects, notifications,
                        permissions
src/components/         ui primitives, layout, dashboard, tracker, projects, timetracker, members,
                        access
src/lib/                hooks and helpers — capabilities, permissions, timeline, notifications,
                        pagination, sorting, columns, view mode, hotkeys, Excel export
src/lib/supabase/       browser client, server (SSR) client, service-role admin client
src/types/              shared TypeScript types
```

## How authorization works

Every table has Row Level Security enabled. API routes and server components query Supabase as the
signed-in user through a cookie-bound client (`src/lib/supabase/server.ts`), so policies apply to every
read and write.

Policies and triggers ask `has_permission('capability')`, which resolves in this order:

1. Super admin — always allowed
2. A per-person override for that capability
3. Their tier's row in the permission matrix
4. Otherwise denied

Rules that aren't a yes/no per tier stay in SQL alongside the capability check — "your own rows",
"people on this project". `src/lib/permissions.ts` computes the same answer for the UI so controls that
would fail aren't shown, but that is presentation only: the database is the enforcement.

The service-role client bypasses RLS and is used in the few places that need it — creating and deleting
auth users, editing a blocker on someone else's update, and raising system notifications that have no
acting user. Each of those checks the caller's permission explicitly first, since RLS won't.
