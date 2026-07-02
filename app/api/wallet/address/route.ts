import { NextResponse } from "next/server";
import { getServerUser } from "@/lib/server-user";

export async function POST(request: Request) {
  try {
    const serverUser = await getServerUser();
    if (!serverUser) {
      return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
    }
    const { supabase, userId } = serverUser;

    const { address } = await request.json();
    if (!address || typeof address !== "string") {
      return NextResponse.json({ error: "Address is required" }, { status: 400 });
    }

    const { error } = await supabase
      .from("profiles")
      .update({ wallet_address: address })
      .eq("id", userId);

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ ok: true });
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Unknown error" },
      { status: 500 },
    );
  }
}
