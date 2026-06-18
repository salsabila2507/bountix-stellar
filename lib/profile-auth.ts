import { PrivyClient } from "@privy-io/server-auth";
import { createClient } from "@/utils/supabase/server";

// Shared type for profile data returned by the API
export type ProfileData = {
  id: string;
  username: string | null;
  display_name: string | null;
  bio: string | null;
  avatar_url: string | null;
  role: string;
  skills: string[];
  wallet_address: string | null;
  social_links: Record<string, string>;
  preferred_language: string;
  can_use_platform: boolean;
  is_early_contributor: boolean;
  referral_code: string | null;
  created_at: string;
  updated_at: string;
};

export type ReferralData = {
  totalInvited: number;
  referredUsers: Array<{
    id: string;
    username: string | null;
    display_name: string | null;
    created_at: string;
    referred_at: string;
  }>;
};

export type AuthResult = {
  profile: ProfileData;
  referrals: ReferralData;
};

const PRIVY_APP_ID = process.env.NEXT_PUBLIC_PRIVY_APP_ID ?? "";
const PRIVY_APP_SECRET = process.env.PRIVY_APP_SECRET ?? "";

export async function getAuthResult(token: string): Promise<AuthResult> {
  const privy = new PrivyClient(PRIVY_APP_ID, PRIVY_APP_SECRET);
  const claims = await privy.verifyAuthToken(token);
  const user = await privy.getUser(claims.userId);
  const privyDid = user.id;

  const supabase = await createClient();

  let { data: profile } = await supabase
    .from("profiles")
    .select("*")
    .eq("privy_did", privyDid)
    .maybeSingle();

  if (!profile) {
    const { data: newProfile } = await supabase
      .from("profiles")
      .insert({ privy_did: privyDid })
      .select("*")
      .single();
    profile = newProfile;
  }

  if (!profile) throw new Error("Failed to create profile");

  // Fetch referrals
  const { data: referralRows, count } = await supabase
    .from("referrals")
    .select("referred_id, created_at", { count: "exact" })
    .eq("referrer_id", profile.id)
    .order("created_at", { ascending: false })
    .limit(5);

  const rows = (referralRows ?? []) as Array<{
    referred_id: string;
    created_at: string;
  }>;
  const referredIds = rows.map((r) => r.referred_id);
  const { data: referredProfiles } = referredIds.length
    ? await supabase
        .from("profiles")
        .select("id, username, display_name, created_at")
        .in("id", referredIds)
    : { data: [] };

  const referredById = new Map(
    ((referredProfiles ?? []) as Array<{
      id: string;
      username: string | null;
      display_name: string | null;
      created_at: string;
    }>).map((r) => [r.id, r]),
  );

  const referredUsers = rows
    .map((row) => {
      const r = referredById.get(row.referred_id);
      if (!r) return null;
      return { ...r, referred_at: row.created_at };
    })
    .filter(Boolean) as ReferralData["referredUsers"];

  return {
    profile: {
      ...profile,
      skills: profile.skills ?? [],
      social_links: profile.social_links ?? {},
    },
    referrals: { totalInvited: count ?? rows.length, referredUsers },
  };
}
