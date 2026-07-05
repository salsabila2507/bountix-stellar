import { NextRequest, NextResponse } from "next/server";
import { createClient, createAdminClient } from "@/utils/supabase/server";
import { isUuid } from "@/lib/tasks";

export async function POST(request: NextRequest) {
  try {
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
    const isAdmin = profile?.role === "admin";

    const { data: app } = await admin
      .from("task_applications")
      .select("task_id")
      .eq("id", applicationId)
      .maybeSingle();
    if (!app) {
      return NextResponse.json({ error: "Application not found" }, { status: 404 });
    }

    const { data: task } = await admin
      .from("tasks")
      .select("creator_id")
      .eq("id", app.task_id)
      .maybeSingle();
    if (!task) {
      return NextResponse.json({ error: "Task not found" }, { status: 404 });
    }
    if (task.creator_id !== user.id && !isAdmin) {
      return NextResponse.json({ error: "Not authorized" }, { status: 403 });
    }

    const { error } = await admin
      .from("task_applications")
      .update({ status: decision })
      .eq("id", applicationId);

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    // Notifications
    try {
      const { data: fullApp } = await admin
        .from("task_applications")
        .select("applicant_id")
        .eq("id", applicationId)
        .maybeSingle();
      if (fullApp) {
        const { data: t } = await admin
          .from("tasks")
          .select("title, creator_id")
          .eq("id", app.task_id)
          .maybeSingle();
        const title = (t as { title: string; creator_id: string } | null)?.title ?? "task";
        const creatorId = (t as { title: string; creator_id: string } | null)?.creator_id ?? null;

        await admin.from("notifications").insert({
          user_id: fullApp.applicant_id,
          title: decision === "accepted" ? "Application accepted" : "Application rejected",
          body:
            decision === "accepted"
              ? `Your application for "${title}" was accepted. Submit your work anytime.`
              : `Your application for "${title}" was rejected. Don't worry — apply to other tasks.`,
          type: "personal",
          link_url:
            decision === "accepted"
              ? `/dashboard/applications#${applicationId}`
              : `/tasks/${app.task_id}`,
        });

        if (decision === "accepted" && creatorId && creatorId !== fullApp.applicant_id) {
          await admin.from("notifications").insert({
            user_id: creatorId,
            title: "Worker ready to deliver",
            body: `An applicant was accepted for "${title}". They can submit work from their dashboard.`,
            type: "personal",
            link_url: `/dashboard/tasks/${app.task_id}/applicants`,
          });
        }
      }
    } catch (err) {
      console.error("[decide] notification error:", err);
    }

    return NextResponse.json({ ok: true });
  } catch (err) {
    console.error("[decide] unhandled error:", err);
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Internal server error" },
      { status: 500 },
    );
  }
}
