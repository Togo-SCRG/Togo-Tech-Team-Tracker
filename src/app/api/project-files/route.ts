import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

const BUCKET = "project-files";
const SIGNED_URL_TTL_SECONDS = 60 * 60; // 1 hour

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

  const { data: settings } = await supabase
    .from("project_settings")
    .select("prd_file_path, prd_file_name, prd_file_size, prd_file_uploaded_at")
    .eq("project", project)
    .maybeSingle();

  if (!settings?.prd_file_path) {
    return NextResponse.json({ file: null });
  }

  const { data: signed, error } = await supabase.storage
    .from(BUCKET)
    .createSignedUrl(settings.prd_file_path, SIGNED_URL_TTL_SECONDS);

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 400 });
  }

  return NextResponse.json({
    file: {
      name: settings.prd_file_name,
      url: signed.signedUrl,
      size: settings.prd_file_size,
      uploadedAt: settings.prd_file_uploaded_at,
    },
  });
}

export async function POST(req: NextRequest) {
  const supabase = createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  // Any signed-in member can attach a PRD — documenting a project isn't an
  // admin action (migration 016). Storage RLS is the backstop.
  const formData = await req.formData();
  const project = formData.get("project");
  const file = formData.get("file");

  if (typeof project !== "string" || !project) {
    return NextResponse.json({ error: "project is required." }, { status: 400 });
  }
  if (!(file instanceof File)) {
    return NextResponse.json({ error: "file is required." }, { status: 400 });
  }
  if (file.size > 20 * 1024 * 1024) {
    return NextResponse.json({ error: "File must be 20MB or smaller." }, { status: 400 });
  }

  // Replace any previous PRD file for this project with a fresh path.
  const { data: existing } = await supabase
    .from("project_settings")
    .select("prd_file_path")
    .eq("project", project)
    .maybeSingle();

  const path = `${project}/${Date.now()}-${file.name}`;

  const { error: uploadError } = await supabase.storage.from(BUCKET).upload(path, file, {
    contentType: file.type || "application/octet-stream",
  });

  if (uploadError) {
    return NextResponse.json({ error: uploadError.message }, { status: 400 });
  }

  if (existing?.prd_file_path) {
    await supabase.storage.from(BUCKET).remove([existing.prd_file_path]);
  }

  const { error: settingsError } = await supabase.from("project_settings").upsert(
    {
      project,
      prd_file_path: path,
      prd_file_name: file.name,
      prd_file_size: file.size,
      prd_file_uploaded_at: new Date().toISOString(),
    },
    { onConflict: "project" }
  );

  if (settingsError) {
    return NextResponse.json({ error: settingsError.message }, { status: 400 });
  }

  return NextResponse.json({ ok: true, fileName: file.name });
}

export async function DELETE(req: NextRequest) {
  const supabase = createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  // Removing an attachment is part of editing the PRD, open to any member
  // (migration 016). Storage RLS is the backstop.
  const { searchParams } = new URL(req.url);
  const project = searchParams.get("project");
  if (!project) {
    return NextResponse.json({ error: "project is required." }, { status: 400 });
  }

  const { data: settings } = await supabase
    .from("project_settings")
    .select("prd_file_path")
    .eq("project", project)
    .maybeSingle();

  if (settings?.prd_file_path) {
    await supabase.storage.from(BUCKET).remove([settings.prd_file_path]);
  }

  const { error } = await supabase
    .from("project_settings")
    .update({ prd_file_path: null, prd_file_name: null, prd_file_size: null, prd_file_uploaded_at: null })
    .eq("project", project);

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 400 });
  }

  return NextResponse.json({ ok: true });
}
