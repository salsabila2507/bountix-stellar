import { NextRequest, NextResponse } from "next/server";
import { createClient, createAdminClient } from "@/utils/supabase/server";
import { isUuid } from "@/lib/tasks";

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { taskId, applicationId, otherUserId, text } = body as {
      taskId?: string;
      applicationId?: string;
      otherUserId?: string;
      text?: string;
    };

    if (!taskId || !isUuid(taskId)) {
      return NextResponse.json({ error: "Invalid taskId" }, { status: 400 });
    }
    if (!otherUserId) {
      return NextResponse.json({ error: "Invalid otherUserId" }, { status: 400 });
    }
    if (!text || text.length > 2000) {
      return NextResponse.json({ error: "Invalid text" }, { status: 400 });
    }

    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const admin = createAdminClient();

    const { data: task } = await admin
      .from("tasks")
      .select("title")
      .eq("id", taskId)
      .maybeSingle();

    const title = (task as { title: string } | null)?.title ?? "Task";

    await admin.from("notifications").insert({
      user_id: otherUserId,
      type: "chat",
      title: "New message",
      body: `${title}: ${text.slice(0, 100)}`,
      link_url: applicationId
        ? `/dashboard/applications#${applicationId}`
        : `/dashboard/tasks/${taskId}/applicants`,
    });

    return NextResponse.json({ ok: true });
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Internal server error" },
      { status: 500 },
    );
  }
}
