import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/utils/supabase/server";
import { adminInvoke } from "@/lib/stellar-admin";

export async function POST(request: NextRequest) {
  const supabase = await createClient();
  const {
    data: { session },
  } = await supabase.auth.getSession();
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = await request.json();
  const { functionName, args } = body;
  if (!functionName || !args) {
    return NextResponse.json(
      { error: "functionName and args required" },
      { status: 400 },
    );
  }

  try {
    const txHash = await adminInvoke(functionName, args);
    return NextResponse.json({ txHash });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unknown error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
