# Togo Tech Hub — Standard Operating Procedure

**Version 1.0 · Last updated 3 August 2026**

---

## 1. Overview

Togo Tech Hub is the internal system of record for what the tech team is working
on. It answers four questions, for everyone, in one place:

- **What projects exist**, and what state each one is in.
- **Who is working on what**, and what they did today.
- **How much time** has gone into each project, against its budget.
- **What is blocked**, and who is waiting on what.

Everything is built around two daily habits: **log an update** (what you did)
and **track time** (how long it took). Every number elsewhere in the hub —
dashboard tiles, project pages, weekly pace, exports — is derived from those two
records plus the project's own settings. Nothing is entered twice.

The system runs on Next.js with a Supabase (Postgres) database. Permissions are
enforced **in the database**, not just hidden in the interface, so a control you
cannot see is also one you cannot reach.

---

## 2. Access levels and who belongs to what

The hub has **4 access levels** and currently **8 people**.

| Access level | People | Count |
| --- | --- | --- |
| **Super admin** | Padwa | 1 |
| **Admin** | Kevin | 1 |
| **Client** | Ed, Michael | 2 |
| **User** | Christian, Khriz Marr, Lawrence, Ronson | 4 |

### At a glance

| Access level | In one line |
| --- | --- |
| **Super admin** | Runs the system. Holds every permission, always, and is the only one who can change anyone else's. |
| **Admin** | Runs the work. Manages every project and sees everyone's activity, but cannot create or delete accounts. |
| **Client** | Watches the work. Full oversight of every project — status, timeline, docs, budget, blockers — but logs no work of their own. |
| **User** | Does the work. Logs updates and time, and manages the projects they are actually on. |

> **Access level is not the same as job title.** The badge next to someone's name
> in the top bar (for example "SUPERVISOR") is their **role** — a free-text job
> title on their profile. It carries no permissions whatsoever. Only the access
> level above decides what a person can do.

### The one rule that shapes everything

Three of the four levels can act on **any** project. **User** is the exception:
a user can only change a project they are **on**.

You are "on" a project if any one of these is true:

1. You are assigned to it in the project's Team list, **or**
2. You have logged a daily update against it, **or**
3. You have logged time against it.

So a user becomes a member of a project simply by starting work on it — there is
no approval step. On a project they are not on, a user is a **read-only viewer**:
they can see everything, and change nothing.

Internally this is the `project.manage.all` permission, held by super admin,
admin and client, and withheld from user.

---

## 3. What each level can do

### 3.1 User — Christian, Khriz Marr, Lawrence, Ronson

**Their daily work**

- Log daily updates for themselves (their own only — never on someone else's behalf).
- Track time, with the built-in timer or a manual entry, tagged with a free-text
  phase such as "Setup" or "Bug fix".
- Edit and delete their own updates and time entries.

**On projects they are on**

- Create a new project, and assign people to it.
- Change project status, timeline, name, overview and PRD (including uploading
  and removing the PRD file).
- Raise, reword and resolve blockers.
- Remove **themselves** from a project.

**What they cannot do**

- See other people's work. The tracker shows a user their own updates only.
- Change anything on a project they are not on.
- Delete a project, set a weekly hour cap, remove anyone else from a project,
  or create or delete accounts.

### 3.2 Client — Ed, Michael

Clients are stakeholders, not contributors. They have **broad oversight and no
authorship**.

**What they can do**

- See everything: every project, and everyone's updates and tracked time.
- Manage **any** project: status, timeline, name, overview, PRD, and the weekly
  hour cap.
- Create projects, assign people to them, and remove people from them.
- Raise, reword and resolve blockers on any project.
- Add other client accounts.

**What they cannot do**

- Log a daily update or track time. Clients report no work of their own, by
  design — this is the main difference from every other level.
- Delete a project.
- Add team-member accounts, or delete any account.

Their profile also differs: a client has a phone number instead of skills and a
GitHub link.

### 3.3 Admin — Kevin

The operational manager. Everything a client can do, plus the ability to log
work and delete projects — but **no control over accounts**.

**In addition to full project oversight**

- Log daily updates and track time, like a user.
- **Delete a project.** This permanently removes its updates, tracked time,
  assignments, settings and blockers. There is no undo.

**What they cannot do**

- Create accounts (neither team members nor clients).
- Delete accounts.
- Log updates on someone else's behalf.
- Change anyone's access level, or edit the permission matrix.

> Account control is deliberately withheld from admin: deleting an account
> destroys everything that person ever logged. The super admin can grant these
> per person if a particular admin needs them.

### 3.4 Super admin — Padwa

Holds **every permission, unconditionally**. This is not a row in the permission
table — the system returns "allowed" for the super admin before it consults the
matrix at all. That is deliberate: it guarantees there is always one account that
can undo a permissions mistake, so no combination of settings can lock everyone
out of the page that fixes settings.

**Exclusive to the super admin**

- Add team-member accounts, and add client accounts.
- Delete accounts (removes the person and everything they logged).
- Log updates **on someone else's behalf**, and edit other people's updates.
- Change anyone's access level.
- Edit the permission matrix, and set per-person exceptions.

---

## 4. Full permission reference

Seeded defaults. The super admin can change any cell of this on the **Access**
page, so treat this table as the starting position, not a law of nature.

| Permission | Super admin | Admin | Client | User |
| --- | :-: | :-: | :-: | :-: |
| **Projects** | | | | |
| Create a project | ✅ | ✅ | ✅ | ✅ |
| Delete a project | ✅ | ✅ | ❌ | ❌ |
| Rename a project | ✅ | ✅ | ✅ | ⚠️ on theirs |
| Change project status | ✅ | ✅ | ✅ | ⚠️ on theirs |
| Change project timeline | ✅ | ✅ | ✅ | ⚠️ on theirs |
| Edit overview & PRD | ✅ | ✅ | ✅ | ⚠️ on theirs |
| Set the weekly hour cap | ✅ | ✅ | ✅ | ❌ |
| Manage every project | ✅ | ✅ | ✅ | ❌ |
| **Team** | | | | |
| Assign people to projects | ✅ | ✅ | ✅ | ✅ |
| Remove people from projects | ✅ | ✅ | ✅ | ❌ (self always) |
| **Work log** | | | | |
| Log daily updates | ✅ | ✅ | ❌ | ✅ |
| Log updates for other people | ✅ | ❌ | ❌ | ❌ |
| Track time | ✅ | ✅ | ❌ | ✅ |
| Raise & resolve blockers | ✅ | ✅ | ✅ | ✅ |
| See everyone's tasks | ✅ | ✅ | ✅ | ❌ |
| **People** | | | | |
| Add team members | ✅ | ❌ | ❌ | ❌ |
| Add clients | ✅ | ❌ | ✅ | ❌ |
| Delete accounts | ✅ | ❌ | ❌ | ❌ |

⚠️ = allowed, but only on projects that person is on (see §2).

### Rules that are not in the grid

These are enforced in code and cannot be switched off, because they are what
keep the grid trustworthy:

1. **The super admin always holds everything.** Never gated.
2. **Nobody can create an account above their own level.**
3. **Only the super admin can edit the Access page.**
4. **You can always act on your own rows** — edit your own updates, remove
   yourself from a project — regardless of the matrix.

### Per-person exceptions

Below the matrix, the Access page allows an exception for one individual, which
beats their level's setting in either direction. Use this instead of promoting
someone: give one engineer project deletion, or hold one client back from editing
the PRD, without inventing a new level.

Precedence, most specific first:

1. Super admin — always everything
2. That person's override — an explicit allow **or deny**
3. Their access level — the matrix above
4. Otherwise — denied

An override of "no" is a real deny. **No override at all** means "inherit from
the level" — the two are different states.

---

## 5. Daily procedures

### 5.1 Log a daily update — *user, admin, super admin*

Do this once per working day, per project you touched.

1. **Daily Updates** → **+ Log update** (or **Log update** on the dashboard).
2. Pick the **project**, or type a new name to start one.
3. Fill in what you did. **Project status** sets the status of the whole
   project, not just this row — so pick the state the project is now in.
4. Add anything in **Concerns/Blockers** if you are held up. This is what
   surfaces on the dashboard and the project page.
5. Save.

Notes:

- A user sees only their own updates here. Everyone else sees the whole team.
- Only the super admin can log an update on someone else's behalf.
- Filter with the status pills, the search box, and Today / This Week /
  This Month or a custom date range. Switch between table and card view, choose
  visible columns, and **Export** to Excel.

### 5.2 Track time — *user, admin, super admin*

Two ways, same result:

- **Start timer** — runs live, survives navigation, stop it when you are done.
- **Log manually** — enter the duration yourself for work already finished.

Tag each entry with a **phase** (free text, e.g. "Setup", "Dev", "Bug fix") and a
note. Totals roll up to the project's **Total logged** and **This week** figures.

### 5.3 Raise and resolve a blocker — *all four levels*

Two routes, and they behave differently — this matters:

| Route | What it creates |
| --- | --- |
| **Blockers & risk** card on the project page → **Add blocker** | A **project blocker only**. It does *not* create a daily update. |
| The **Concerns/Blockers** field when logging a daily update | Part of that update, and also shown as a project blocker. |

Both appear together in the project's Blockers list and both count towards the
dashboard's **Blockers** tile and the project's blocker badge.

To resolve one, open the **Blockers & risk** card and tick it. Resolving a
project blocker keeps a record of it; resolving one attached to a daily update
clears the wording from that update.

Clients can raise and resolve blockers even though they cannot log work — raising
a risk is oversight, not authorship.

### 5.4 Start a project — *all four levels*

1. **Projects** → **Create project**.
2. Give it a name, and optionally an overview, a PRD, a timeline and a starting team.
3. Everyone assigned is notified; the whole team is notified that the project exists.

A project also comes into existence implicitly, by typing a new project name when
logging an update or tracking time.

### 5.5 Run a project — *any level, subject to §2*

The project page is the single view of one project:

- **Header** — name (editable), status, total hours, team size, update count,
  last activity, and the timeline.
- **Overview & Requirements / PRD** — two tabs. The PRD can be pasted as text or
  uploaded as a file (PDF, Office, Markdown, HTML — all previewable in the app).
- **Total logged · This week · Blockers & risk** — set a weekly hour cap to
  measure pace against a budget.
- **Time tracking & logs** — every entry, exportable.
- **Team** — the roster, each person's status and hours. Add or remove people.
- **Activity & history** — updates and time entries in one stream.

**Renaming a project** rewrites its name everywhere at once — updates, time
entries, assignments, settings, notifications and blockers — in a single
transaction. Two things to know: the URL changes, so old links stop working; and
renaming onto a name already in use is refused rather than merging the two
projects.

**Deleting a project** is permanent and takes its updates, time entries,
assignments, settings and blockers with it. Admin and super admin only.

### 5.6 Notifications — *everyone*

The bell in the top bar and the **Notifications** page. Four kinds:

| Type | Trigger |
| --- | --- |
| Added to a project | Someone assigns you |
| Removed from a project | Someone unassigns you |
| New project | Anyone creates a project |
| Project overdue | Automatic, when a timeline passes with the project unfinished |

Tabs for **All / Unread / Archived**. Tick the checkbox on any row — or the
select-all box — to mark several as read or unread, archive them, or delete them
in one go. Search by project or person. **Archiving keeps a notification;
deleting does not** and cannot be undone.

Opening the page clears the red badge; individual items stay unread until you
actually open them.

---

## 6. Administration — super admin only

### 6.1 Add someone

**Access** → **Create user**, or **Team** → add. Set their name, job title,
email and access level. Clients can also add client accounts.

Remember: you cannot create an account above your own level.

### 6.2 Change what a level can do

**Access** → **Permissions**. Tick or untick a cell; it applies immediately. The
super admin column is locked, for the reason given in §3.4.

For one individual rather than a whole level, use the per-person section
underneath (§4).

### 6.3 Change someone's access level

**Access** → the access levels table, or the person's profile page.

### 6.4 Delete an account

Removes the person **and everything they logged**. There is no undo. Prefer
changing their access level if the goal is only to stop them acting.

### 6.5 Database migrations

Schema changes live in `supabase/migrations/` and are applied **by hand, in
order**, in the Supabase SQL Editor. Each file states which migration it must
follow. They are written to be safely re-runnable.

> **Currently outstanding: `037_rename_project.sql` and
> `038_project_blockers.sql`.** Until 037 is run, the rename control does not
> appear. Until 038 is run, "Add blocker" on the project page cannot save. The
> rest of the hub works normally in the meantime.

Deployment is covered in `DEPLOYMENT.md`. Production builds from the `main`
branch — work merged to any other branch will not appear on the live site.

---

## 7. Conventions

- **One update per project per day.** The hub measures days; two updates for the
  same day on the same project make the history harder to read, not richer.
- **Set a timeline.** It is what drives the overdue notification. Free text
  ("End of Q3") or a date, whichever is honest.
- **Set a weekly hour cap** on anything with a budget, so pace is measurable
  rather than a matter of opinion.
- **Blockers are for things you cannot solve alone.** They are visible to
  everyone including clients, and they mark the project as held up.
- **Archive, don't delete.** True for notifications, and true for people:
  change an access level before removing an account.
- **Project status is the project's, not yours.** Setting it in an update moves
  the whole project.

---

## 8. Change log

| Version | Date | Change |
| --- | --- | --- |
| 1.0 | 3 Aug 2026 | First issue. |
