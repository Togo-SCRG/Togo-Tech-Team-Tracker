import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { capabilitiesFor } from "@/lib/permissions";

export async function GET() {
  const supabase = createClient();

  const {
    data: { user: authUser },
  } = await supabase.auth.getUser();

  if (!authUser) {
    return NextResponse.json({ user: null });
  }

  const { data: profile, error } = await supabase
    .from("profiles")
    .select("id, email, name, avatar_url, role, is_admin, access_level")
    .eq("id", authUser.id)
    .single();

  if (error || !profile) {
    return NextResponse.json({ user: null });
  }

  const capabilities = await capabilitiesFor(supabase, profile.access_level, profile.id);

  return NextResponse.json({
    user: {
      id: profile.id,
      email: profile.email,
      name: profile.name,
      avatarUrl: profile.avatar_url,
      role: profile.role,
      isAdmin: profile.is_admin,
      accessLevel: profile.access_level,
      isSuperAdmin: profile.access_level === "super_admin",
      isClient: profile.access_level === "client",
      // Mirrors the database rule (migration 029): clients are read-only.
      canEdit: profile.access_level !== "client",
      capabilities,
    },
  });
}
