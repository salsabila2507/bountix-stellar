import { NextRequest, NextResponse } from "next/server";
import { createClient, createAdminClient } from "@/utils/supabase/server";

export async function GET(request: NextRequest) {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const admin = createAdminClient();
    const { searchParams } = new URL(request.url);
    const status = searchParams.get("status"); // open | resolved | all

    const { data: profile } = await admin
      .from("profiles")
      .select("role")
      .eq("id", user.id)
      .maybeSingle();
    const isAdminUser = (profile as any)?.role === "admin";

    let query = admin.from("disputes").select("*");

    if (isAdminUser) {
      if (status === "open") query = query.eq("status", "open");
      else if (status === "resolved") query = query.eq("status", "resolved");
    } else {
      query = query.eq("worker_id", user.id);
    }

    query = query.order("created_at", { ascending: false });

    const { data: disputes, error } = await query;

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ disputes: disputes ?? [] });
  } catch (err) {
    console.error("[disputes] unhandled error:", err);
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Internal server error" },
      { status: 500 },
    );
  }
}
