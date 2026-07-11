import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/utils/supabase/server";
import { adminInvoke, adminQuery } from "@/lib/stellar-admin";

export async function POST(request: NextRequest) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = await request.json();

  // Read-only query (e.g. check if escrow exists)
  if (body._query) {
    try {
      const exists = await adminQuery(body.functionName, body.args);
      return NextResponse.json({ exists });
    } catch (err) {
      const message = err instanceof Error ? err.message : "Unknown error";
      return NextResponse.json({ error: message }, { status: 500 });
    }
  }

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
