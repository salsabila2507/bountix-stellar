import { NextRequest, NextResponse } from "next/server";
import { createClient, createAdminClient } from "@/utils/supabase/server";
import { adminInvoke } from "@/lib/stellar-admin";
import { uuidToBytes32 } from "@/lib/escrow";

export async function POST(request: NextRequest) {
  try {
    let body: { disputeId?: string; resolution?: string; adminNotes?: string };
    try {
      body = await request.json();
    } catch {
      return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
    }
    const { disputeId, resolution, adminNotes } = body;

    if (!disputeId || !resolution || !["accepted", "rejected"].includes(resolution)) {
      return NextResponse.json({ error: "Invalid resolution (must be accepted or rejected)" }, { status: 400 });
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
    if ((profile as { role?: string } | null)?.role !== "admin") {
      return NextResponse.json({ error: "Only admins can resolve disputes" }, { status: 403 });
    }

    const { data: dispute } = await admin
      .from("disputes")
      .select("id, status, submission_id, task_id, task_title, worker_id")
      .eq("id", disputeId)
      .maybeSingle();

    if (!dispute) {
      return NextResponse.json({ error: "Dispute not found" }, { status: 404 });
    }

    if (dispute.status !== "open") {
      return NextResponse.json({ error: "Dispute is already resolved" }, { status: 400 });
    }

    const { error } = await admin
      .from("disputes")
      .update({
        status: "resolved",
        resolution,
        resolved_by: user.id,
        admin_notes: (adminNotes ?? "").trim() || null,
        resolved_at: new Date().toISOString(),
      })
      .eq("id", disputeId);

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    // On-chain escrow action
    try {
      const taskKey = uuidToBytes32(dispute.task_id);
      if (resolution === "accepted") {
        await adminInvoke("release_half_escrow", [taskKey]);
        const { error: subErr } = await admin
          .from("task_submissions")
          .update({ status: "pending_review", review_notes: "Dispute accepted — re-review" })
          .eq("id", dispute.submission_id);
        if (subErr) {
          console.error("[dispute/resolve] failed to reopen submission:", subErr);
        }
      } else {
        await adminInvoke("refund_escrow", [taskKey]);
      }
    } catch (err) {
      console.error("[dispute/resolve] escrow invoke error:", err);
      return NextResponse.json(
        { error: err instanceof Error ? err.message : "Escrow invoke failed" },
        { status: 500 },
      );
    }

    try {
      await admin.from("notifications").insert({
        user_id: dispute.worker_id,
        title: resolution === "accepted" ? "Dispute resolved in your favor" : "Dispute denied",
        body:
          resolution === "accepted"
            ? `Your dispute for "${dispute.task_title}" was accepted. The admin will review and release payment.`
            : `Your dispute for "${dispute.task_title}" was denied.${adminNotes ? ` Notes: ${adminNotes}` : ""}`,
        type: "personal",
        link_url: "/dashboard/applications",
      });
    } catch (err) {
      console.error("[dispute/resolve] notification error:", err);
    }

    return NextResponse.json({ ok: true });
  } catch (err) {
    console.error("[dispute/resolve] unhandled error:", err);
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Internal server error" },
      { status: 500 },
    );
  }
}
