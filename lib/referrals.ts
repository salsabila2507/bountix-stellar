export const REFERRAL_CODE_PATTERN = /^[a-z0-9]{8,16}$/;

export type ReferralReviewStatus =
  | "approved"
  | "pending_review"
  | "invite_to_qualify";

export function normalizeReferralCode(value: FormDataEntryValue | string | null) {
  const code = String(value ?? "").trim().toLowerCase();
  return REFERRAL_CODE_PATTERN.test(code) ? code : "";
}

export function getReferralReviewStatus({
  invitedCount,
  isEarlyContributor,
}: {
  invitedCount: number;
  isEarlyContributor: boolean;
}): ReferralReviewStatus {
  if (isEarlyContributor) return "approved";
  if (invitedCount > 0) return "pending_review";
  return "invite_to_qualify";
}

export function getPublicSiteUrl() {
  const configured = process.env.NEXT_PUBLIC_SITE_URL?.trim().replace(
    /\/$/,
    "",
  );
  if (configured?.startsWith("https://")) {
    return configured;
  }
  if (process.env.VERCEL_URL) {
    return `https://${process.env.VERCEL_URL}`;
  }
  return "https://www.bountix.xyz";
}

export function getReferralLink(referralCode: string) {
  const url = new URL("/signup", getPublicSiteUrl());
  url.searchParams.set("ref", referralCode);
  return url.toString();
}
