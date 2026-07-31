import { cookies } from "next/headers";
import { createServerClient, type CookieOptions } from "@supabase/ssr";

// A Supabase client scoped to the current request's session cookies.
// All queries made with this client are subject to Postgres RLS as the
// signed-in user — admins are only able to bypass owner checks because
// the `is_admin()` policies allow it, not because this client has elevated
// privileges.
export function createClient() {
  const cookieStore = cookies();

  return createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return cookieStore.getAll();
        },
        setAll(cookiesToSet: { name: string; value: string; options: CookieOptions }[]) {
          try {
            cookiesToSet.forEach(({ name, value, options }) => {
              cookieStore.set(name, value, options);
            });
          } catch {
            // setAll is called from a Server Component where cookies can't
            // be mutated; middleware.ts refreshes the session instead.
          }
        },
      },
    }
  );
}
