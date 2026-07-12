import { NextResponse } from "next/server";
import { createClient } from "@/utils/supabase/server";
import { generateUserSig } from "@/lib/chat/usersig";

export async function GET() {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    const userSig = generateUserSig(user.id);
    return NextResponse.json({ userSig, userId: user.id });
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Internal server error" },
      { status: 500 },
    );
  }
}
