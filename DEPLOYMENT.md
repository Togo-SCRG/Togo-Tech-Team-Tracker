# Deploying Togo Tech Team Tracker

Two things need to happen before the app works anywhere: the database must be migrated in Supabase, and
the app must be deployed with the right environment variables.

## 1. Set up the Supabase project

1. Create a project at [supabase.com](https://supabase.com/dashboard), or open your existing one.
2. Open the **SQL Editor** and run the migrations from `supabase/migrations/` **in numeric order**
   (`001` through `035`). Each file's header comment says what it does and which file it expects to
   follow. They're written to be idempotent, so re-running one is safe.

   The `supabase/` directory is deliberately not tracked in git (see `.gitignore`), so it won't be in a
   fresh clone — keep your copy somewhere private and back it up.
3. After migrating, paste `supabase/check_schema_state.sql` into the SQL Editor. It's read-only and
   reports any expected function, table or column that's missing, which is how you catch a skipped
   migration before it surfaces as a runtime error.
4. Grab your API keys from **Settings → API**:
   - `Project URL` → `NEXT_PUBLIC_SUPABASE_URL`
   - `anon` `public` key → `NEXT_PUBLIC_SUPABASE_ANON_KEY`
   - `service_role` `secret` key → `SUPABASE_SERVICE_ROLE_KEY` (server-only, never expose to the browser)

### Creating the first account

There are no default credentials. Create the first user under **Authentication → Users**, then promote
that profile to super admin in the SQL Editor:

```sql
update public.profiles set access_level = 'super_admin' where email = 'you@example.com';
```

Everything after that is done in the app: Team → **Add member** / **Add Client**, or Access Levels →
**New user**. Each generates a password and displays it once — nothing is emailed, so copy it before
closing the dialog and pass it on yourself.

## 2. Run locally against Supabase

```bash
npm install
cp .env.local.example .env.local   # if you don't already have .env.local
# fill in NEXT_PUBLIC_SUPABASE_URL / NEXT_PUBLIC_SUPABASE_ANON_KEY / SUPABASE_SERVICE_ROLE_KEY
npm run dev
```

## 3. Deploy to Vercel

1. **Push to GitHub.**

   ```bash
   git init
   git add .
   git commit -m "Togo Tech Team Tracker"
   git branch -M main
   git remote add origin <your-github-repo-url>
   git push -u origin main
   ```

   Check `git status` before the first commit and confirm `.env.local` and `supabase/` are both absent —
   `.gitignore` covers them, but it's worth seeing for yourself once.

2. **Import on Vercel.**
   - Go to https://vercel.com/new and import the repository.
   - Framework preset: Next.js (auto-detected). No build command changes needed.

3. **Add environment variables** (Project Settings → Environment Variables, or during import):

   | Name                            | Value                                              |
   |---------------------------------|----------------------------------------------------|
   | `NEXT_PUBLIC_SUPABASE_URL`      | `https://<your-project-ref>.supabase.co`           |
   | `NEXT_PUBLIC_SUPABASE_ANON_KEY` | anon/public key from Supabase API settings         |
   | `SUPABASE_SERVICE_ROLE_KEY`     | service_role key from Supabase API settings        |

   Add them to all three environments (Production, Preview, Development) so preview deploys work too.

4. **Deploy.** Vercel builds on every push; the first deploy runs when you click "Deploy" in the import
   flow.

5. **Add the Vercel domain to Supabase Auth** — Authentication → URL Configuration → add your
   `*.vercel.app` domain, and any custom domain, to the Redirect URLs allow list. Only strictly needed if
   you later add email confirmation, magic links, or OAuth.

## 4. Verify

- Visit the deployed URL → it should redirect to `/login`.
- Sign in as the super admin you created above.
- Confirm the dashboard, tracker, projects and team pages load data.
- Open Access Levels and check the permission matrix renders. If it shows an amber "table doesn't exist"
  warning, migration `032` hasn't been applied.

## Notes

- Auth is handled entirely by Supabase Auth (`@supabase/supabase-js` + `@supabase/ssr`); there is no
  custom session or cookie logic in the app.
- Authorization is Postgres Row Level Security, not application code. Policies and triggers call
  `has_permission('capability')`, which reads the permission matrix the super admin edits in the UI.
- `SUPABASE_SERVICE_ROLE_KEY` **is** required: a few routes need it to create and delete auth users, edit
  a blocker on someone else's update, and raise system notifications with no acting user. Those routes
  check the caller's permission explicitly, because the service-role client bypasses RLS. Keep the key
  server-side only.
