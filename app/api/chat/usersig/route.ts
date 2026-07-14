import { NextResponse } from "next/server";
import { createClient } from "@/utils/supabase/server";
import { toTencentChatUserId } from "@/lib/chat/user-id";
import { generateUserSig, getTencentChatSdkAppId } from "@/lib/chat/usersig";

export async function GET() {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const chatUserId = toTencentChatUserId(user.id);
    const userSig = generateUserSig(chatUserId);
    return NextResponse.json({
      sdkAppId: getTencentChatSdkAppId(),
      userSig,
      userId: chatUserId,
    });
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Internal server error" },
      { status: 500 },
    );
  }
}
