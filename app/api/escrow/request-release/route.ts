import { NextRequest, NextResponse } from "next/server";
import { createClient, createAdminClient } from "@/utils/supabase/server";
import { isUuid } from "@/lib/tasks";

export async function POST(request: NextRequest) {
  try {
    let body: { submissionId?: string; taskId?: string; workerWalletAddress?: string };
    try {
      body = await request.json();
    } catch {
      return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
    }
    const { submissionId, taskId, workerWalletAddress } = body;

    if (!submissionId || !isUuid(submissionId)) {
      return NextResponse.json({ error: "Invalid submissionId" }, { status: 400 });
    }
    if (!taskId || !isUuid(taskId)) {
      return NextResponse.json({ error: "Invalid taskId" }, { status: 400 });
    }

    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const admin = createAdminClient();

    const { data: task } = await admin
      .from("tasks")
      .select("creator_id, title")
      .eq("id", taskId)
      .maybeSingle();

    if (!task) {
      return NextResponse.json({ error: "Task not found" }, { status: 404 });
    }
    if (task.creator_id !== user.id) {
      return NextResponse.json({ error: "Not authorized" }, { status: 403 });
    }

    // Verify submission is approved
    const { data: submission } = await admin
      .from("task_submissions")
      .select("status")
      .eq("id", submissionId)
      .maybeSingle();
    if (!submission) {
      return NextResponse.json({ error: "Submission not found" }, { status: 404 });
    }
    if (submission.status !== "approved") {
      return NextResponse.json({ error: "Submission must be approved first" }, { status: 400 });
    }

    // Check if already requested
    const { data: existing } = await admin
      .from("notifications")
      .select("id")
      .eq("type", "escrow_release_request")
      .eq("link_url", `/dashboard/tasks/${taskId}/applicants#${submissionId}`)
      .maybeSingle();

    if (existing) {
      return NextResponse.json({ ok: true, message: "Already requested" });
    }

    // Notify all admins
    const { data: admins } = await admin
      .from("profiles")
      .select("id")
      .eq("role", "admin");

    const adminIds = admins?.map((a) => a.id) ?? [];
    if (adminIds.length === 0) {
      return NextResponse.json({ error: "No admin found" }, { status: 500 });
    }

    const notifications = adminIds.map((adminId) => ({
      user_id: adminId,
      type: "escrow_release_request",
      title: "Escrow release requested",
      body: `Task "${task.title}" is approved and waiting for escrow release. Worker wallet: ${workerWalletAddress ?? "N/A"}`,
      link_url: `/dashboard/tasks/${taskId}/applicants`,
    }));

    const { error: insertError } = await admin
      .from("notifications")
      .insert(notifications);

    if (insertError) {
      return NextResponse.json({ error: insertError.message }, { status: 500 });
    }

    return NextResponse.json({ ok: true });
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Internal server error" },
      { status: 500 },
    );
  }
}
