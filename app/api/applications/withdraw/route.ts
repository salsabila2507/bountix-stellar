import { NextRequest, NextResponse } from "next/server";
import { getServerUser } from "@/lib/server-user";
import { isUuid } from "@/lib/tasks";

export async function POST(request: NextRequest) {
  let body: { applicationId?: string };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }
  const { applicationId } = body;
  if (!applicationId || !isUuid(applicationId)) {
    return NextResponse.json({ error: "Invalid applicationId" }, { status: 400 });
  }
  const serverUser = await getServerUser();
  if (!serverUser) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { supabase, userId } = serverUser;

  const { data: app } = await supabase
    .from("task_applications")
    .select("task_id, applicant_id, status")
    .eq("id", applicationId)
    .maybeSingle();
  if (!app) {
    return NextResponse.json({ error: "Application not found" }, { status: 404 });
  }
  if (app.applicant_id !== userId) {
    return NextResponse.json({ error: "Not your application" }, { status: 403 });
  }

  const { error } = await supabase
    .from("task_applications")
    .update({ status: "withdrawn" })
    .eq("id", applicationId);

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ ok: true });
}
