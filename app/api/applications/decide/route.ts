import { NextRequest, NextResponse } from "next/server";
import { getServerUser } from "@/lib/server-user";
import { isUuid } from "@/lib/tasks";

export async function POST(request: NextRequest) {
  let body: { applicationId?: string; decision?: string };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }
  const { applicationId, decision } = body;
  if (!applicationId || !isUuid(applicationId)) {
    return NextResponse.json({ error: "Invalid applicationId" }, { status: 400 });
  }
  if (decision !== "accepted" && decision !== "rejected") {
    return NextResponse.json({ error: "Invalid decision" }, { status: 400 });
  }
  const serverUser = await getServerUser();
  if (!serverUser) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { supabase, userId } = serverUser;

  const { data: profile } = await supabase
    .from("profiles")
    .select("role")
    .eq("id", userId)
    .maybeSingle();
  const isAdmin = profile?.role === "admin";

  const { data: app } = await supabase
    .from("task_applications")
    .select("task_id")
    .eq("id", applicationId)
    .maybeSingle();
  if (!app) {
    return NextResponse.json({ error: "Application not found" }, { status: 404 });
  }

  const { data: task } = await supabase
    .from("tasks")
    .select("creator_id")
    .eq("id", app.task_id)
    .maybeSingle();
  if (!task) {
    return NextResponse.json({ error: "Task not found" }, { status: 404 });
  }
  if (task.creator_id !== userId && !isAdmin) {
    return NextResponse.json({ error: "Not authorized" }, { status: 403 });
  }

  const { error } = await supabase
    .from("task_applications")
    .update({ status: decision })
    .eq("id", applicationId);

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ ok: true });
}
