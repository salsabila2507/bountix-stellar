import { NextRequest, NextResponse } from "next/server";
import { createClient, createAdminClient } from "@/utils/supabase/server";
import { isUuid } from "@/lib/tasks";

export async function POST(request: NextRequest) {
  try {
    let body: { submissionId?: string; decision?: string; review_notes?: string };
    try {
      body = await request.json();
    } catch {
      return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
    }
    const { submissionId, decision, review_notes } = body;

    if (!submissionId || !isUuid(submissionId)) {
      return NextResponse.json({ error: "Invalid submissionId" }, { status: 400 });
    }
    if (decision !== "approved" && decision !== "rejected" && decision !== "revision_requested") {
      return NextResponse.json({ error: "Invalid decision" }, { status: 400 });
    }

    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const admin = createAdminClient();

    const { data: profile } = await admin
      .from("profiles")
      .select("role")
      .eq("id", user.id)
      .maybeSingle();
    const isAdminUser = profile?.role === "admin";

    const { data: row } = await admin
      .from("task_submissions")
      .select("task_id")
      .eq("id", submissionId)
      .maybeSingle();

    if (!row?.task_id) {
      return NextResponse.json({ error: "Submission not found" }, { status: 404 });
    }

    const { data: task } = await admin
      .from("tasks")
      .select("creator_id")
      .eq("id", row.task_id)
      .maybeSingle();

    if (!task || (task.creator_id !== user.id && !isAdminUser)) {
      return NextResponse.json({ error: "Not authorized" }, { status: 403 });
    }

    const { error } = await admin
      .from("task_submissions")
      .update({
        status: decision,
        review_notes: (review_notes ?? "").trim() || null,
        reviewed_at: new Date().toISOString(),
      })
      .eq("id", submissionId);

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    // Notification
    try {
      const { data: sub } = await admin
        .from("task_submissions")
        .select("submitter_id")
        .eq("id", submissionId)
        .maybeSingle();
      const { data: t } = await admin
        .from("tasks")
        .select("title")
        .eq("id", row.task_id)
        .maybeSingle();
      const subRow = sub as { submitter_id: string } | null;
      const title = (t as { title: string } | null)?.title ?? "task";
      if (subRow?.submitter_id) {
        const verbMap: Record<string, string> = {
          approved: "Your work was approved",
          rejected: "Your work was rejected",
          revision_requested: "Revisions requested",
        };
        const bodyMap: Record<string, string> = {
          approved: `Great work! "${title}" was approved. Admin will review and release escrow shortly.`,
          rejected: `"${title}" was rejected.${review_notes ? ` Reason: ${review_notes}` : ""}`,
          revision_requested: `"${title}" needs changes.${review_notes ? ` ${review_notes}` : ""}`,
        };
        await admin.from("notifications").insert({
          user_id: subRow.submitter_id,
          title: verbMap[decision] ?? "Submission reviewed",
          body: bodyMap[decision] ?? `Your submission for "${title}" was reviewed.`,
          type: "personal",
          link_url: `/dashboard/applications#${submissionId}`,
        });
      }
    } catch (err) {
      console.error("[review] notification error:", err);
    }

    return NextResponse.json({ ok: true });
  } catch (err) {
    console.error("[review] unhandled error:", err);
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Internal server error" },
      { status: 500 },
    );
  }
}
