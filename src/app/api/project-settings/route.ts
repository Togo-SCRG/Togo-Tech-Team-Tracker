import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

function toCamel(data: {
  project: string;
  weekly_hour_cap: number | null;
  overview: string | null;
  prd: string | null;
  timeline: string | null;
  status: string;
}) {
  return {
    project: data.project,
    weeklyHourCap: data.weekly_hour_cap,
    overview: data.overview,
    prd: data.prd,
    timeline: data.timeline,
    status: data.status,
  };
}

export async function GET(req: NextRequest) {
  const supabase = createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { searchParams } = new URL(req.url);
  const project = searchParams.get("project");
  if (!project) {
    return NextResponse.json({ error: "project is required." }, { status: 400 });
  }

  const { data, error } = await supabase
    .from("project_settings")
    .select("project, weekly_hour_cap, overview, prd, timeline, status")
    .eq("project", project)
    .maybeSingle();

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({
    settings: toCamel(data || { project, weekly_hour_cap: null, overview: null, prd: null, timeline: null, status: "Not Started" }),
  });
}

export async function PATCH(req: NextRequest) {
  const supabase = createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = await req.json();
  const { project, weeklyHourCap, overview, prd, timeline, status } = body;
  if (!project) {
    return NextResponse.json({ error: "project is required." }, { status: 400 });
  }

  const upsertData: Record<string, unknown> = { project };
  if (weeklyHourCap !== undefined) upsertData.weekly_hour_cap = weeklyHourCap;
  if (overview !== undefined) upsertData.overview = overview;
  if (prd !== undefined) upsertData.prd = prd;
  if (timeline !== undefined) upsertData.timeline = timeline;
  if (status !== undefined) upsertData.status = status;

  const { data, error } = await supabase
    .from("project_settings")
    .upsert(upsertData, { onConflict: "project" })
    .select("project, weekly_hour_cap, overview, prd, timeline, status")
    .single();

  if (error) {
    const denied = error.code === "42501";
    // Overview/PRD are open to everyone; status and timeline need membership
    // and the weekly cap stays admin-only. A trigger rejects those and names
    // the reason (migration 028), so pass its message through rather than
    // flattening every denial to one generic line.
    return NextResponse.json(
      { error: denied ? error.message || "You don't have permission to change that." : error.message },
      { status: denied ? 403 : 400 }
    );
  }

  return NextResponse.json({ settings: toCamel(data) });
}
