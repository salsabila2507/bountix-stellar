import { NextRequest, NextResponse } from "next/server";
import { createClient, createAdminClient } from "@/utils/supabase/server";

export async function POST(request: NextRequest) {
  try {
    let body: { submissionId?: string; reason?: string };
    try {
      body = await request.json();
    } catch {
      return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
    }
    const { submissionId, reason } = body;

    if (!submissionId || !reason || reason.trim().length < 10) {
      return NextResponse.json({ error: "Provide a detailed reason (min 10 chars)" }, { status: 400 });
    }

    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const admin = createAdminClient();

    const { data: submission } = await admin
      .from("task_submissions")
      .select("id, task_id, submitter_id, status")
      .eq("id", submissionId)
      .maybeSingle();

    if (!submission) {
      return NextResponse.json({ error: "Submission not found" }, { status: 404 });
    }

    if (submission.submitter_id !== user.id) {
      return NextResponse.json({ error: "You can only dispute your own submissions" }, { status: 403 });
    }

    if (submission.status !== "rejected") {
      return NextResponse.json({ error: "Only rejected submissions can be disputed" }, { status: 400 });
    }

    const { data: task } = await admin
      .from("tasks")
      .select("title, creator_id")
      .eq("id", submission.task_id)
      .maybeSingle();

    if (!task) {
      return NextResponse.json({ error: "Task not found" }, { status: 404 });
    }

    const { data: profile } = await admin
      .from("profiles")
      .select("username, display_name")
      .eq("id", user.id)
      .maybeSingle();

    const profileRow = profile as { username?: string | null; display_name?: string | null } | null;
    const workerName = profileRow?.display_name ?? profileRow?.username ?? "Anonymous";

    const { data: existing } = await admin
      .from("disputes")
      .select("id, status")
      .eq("submission_id", submissionId)
      .maybeSingle();

    if (existing?.status === "open") {
      return NextResponse.json({ error: "A dispute is already open for this submission" }, { status: 409 });
    }

    if (existing?.status === "resolved") {
      return NextResponse.json({ error: "This submission has already been disputed and resolved" }, { status: 409 });
    }

    const { data: dispute, error } = await admin
      .from("disputes")
      .insert({
        submission_id: submissionId,
        task_id: submission.task_id,
        task_title: task.title,
        worker_id: user.id,
        worker_name: workerName,
        reason: reason.trim(),
      })
      .select()
      .single();

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    try {
      await admin.from("notifications").insert({
        user_id: task.creator_id,
        title: "Dispute raised",
        body: `${workerName} disputed the rejection for "${task.title}": ${reason.trim().substring(0, 200)}`,
        type: "personal",
        link_url: `/admin/disputes`,
      });
    } catch (err) {
      console.error("[dispute] notification error:", err);
    }

    return NextResponse.json({ ok: true, dispute });
  } catch (err) {
    console.error("[dispute/create] unhandled error:", err);
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Internal server error" },
      { status: 500 },
    );
  }
}
