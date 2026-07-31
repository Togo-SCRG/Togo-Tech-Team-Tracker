import { createClient } from "@/lib/supabase/server";
import { MembersView } from "@/components/members/MembersView";
import { compareByRole } from "@/lib/utils";
import type { AccessLevel } from "@/types";

interface ProfileRow {
  id: string;
  name: string;
  avatar_url: string | null;
  role: string;
  access_level: AccessLevel;
  invited_at?: string | null;
  signed_in_at?: string | null;
}

export default async function MembersPage() {
  const supabase = createClient();

  // invited_at/signed_in_at arrive with migration 018; fall back to the base
  // columns so the page still renders before it's been run.
  const BASE_COLUMNS = "id, name, avatar_url, role, access_level";
  const withInvite = await supabase
    .from("profiles")
    .select(`${BASE_COLUMNS}, invited_at, signed_in_at`)
    .neq("access_level", "client");

  const profiles: ProfileRow[] =
    (withInvite.data as ProfileRow[] | null) ??
    ((await supabase.from("profiles").select(BASE_COLUMNS).neq("access_level", "client"))
      .data as ProfileRow[] | null) ??
    [];

  const { data: updates } = await supabase
    .from("daily_updates")
    .select("user_id, project, status, date")
    .order("date", { ascending: false });

  const members = profiles
    .map((p) => ({
      ...p,
      // Invited but never signed in. Seeded accounts have no invited_at, so
      // they're never flagged even if they haven't signed in yet.
      pending: !!p.invited_at && !p.signed_in_at,
      // Kept unsliced so the project count reflects all of a member's work,
      // not just their most recent few updates.
      updates: (updates || []).filter((u) => u.user_id === p.id),
    }))
    .sort(compareByRole);

  return (
    <div className="space-y-6">
      <MembersView members={members} />
    </div>
  );
}
