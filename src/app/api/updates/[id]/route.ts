import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { syncProjectStatus } from "@/lib/syncProjectStatus";

function toCamel(row: any) {
  return {
    id: row.id,
    userId: row.user_id,
    user: row.profiles
      ? { id: row.profiles.id, name: row.profiles.name, avatarUrl: row.profiles.avatar_url, role: row.profiles.role }
      : undefined,
    date: row.date,
    project: row.project,
    update: row.update,
    whatsLeft: row.whats_left,
    timeline: row.timeline,
    blockers: row.blockers,
    status: row.status,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

export async function PATCH(req: NextRequest, { params }: { params: { id: string } }) {
  const supabase = createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = await req.json();
  const { date, project, update, whatsLeft, timeline, blockers, status } = body;

  const data: Record<string, unknown> = {};
  if (date !== undefined) data.date = date;
  if (project !== undefined) data.project = project;
  if (update !== undefined) data.update = update;
  if (whatsLeft !== undefined) data.whats_left = whatsLeft;
  if (timeline !== undefined) data.timeline = timeline;
  if (blockers !== undefined) data.blockers = blockers;
  if (status !== undefined) data.status = status;

  const { data: updated, error } = await supabase
    .from("daily_updates")
    .update(data)
    .eq("id", params.id)
    .select("*, profiles(id, name, avatar_url, role)")
    .single();

  if (error) {
    return NextResponse.json({ error: "You can only edit your own updates." }, { status: 403 });
  }

  // Editing the status here moves the project as well, same as logging it does.
  await syncProjectStatus(supabase, updated.project, status);

  return NextResponse.json({ update: toCamel(updated) });
}

export async function DELETE(_req: NextRequest, { params }: { params: { id: string } }) {
  const supabase = createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { error, count } = await supabase.from("daily_updates").delete({ count: "exact" }).eq("id", params.id);

  if (error || !count) {
    return NextResponse.json({ error: "You can only delete your own updates." }, { status: 403 });
  }

  return NextResponse.json({ ok: true });
}
