import { createClient as createSupabaseClient } from "@supabase/supabase-js";

// Service-role client — bypasses RLS entirely. Server-only; never import
// this into a Client Component. Not used by the core app flows (RLS +
// the user's own session cookie is sufficient for everything in
// src/app/api), but kept available for admin tooling (e.g. scripted user
// provisioning) that needs to write to auth.users directly.
export function createAdminClient() {
  return createSupabaseClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    {
      auth: {
        autoRefreshToken: false,
        persistSession: false,
      },
    }
  );
}
