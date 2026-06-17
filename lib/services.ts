import type { SocialLinks } from "@/lib/profile";

export const SERVICE_PRICE_TYPES = ["fixed", "negotiable"] as const;
export type ServicePriceType = (typeof SERVICE_PRICE_TYPES)[number];

export const SERVICE_PAYMENT_METHODS = ["manual", "escrow_stellar"] as const;
export type ServicePaymentMethod = (typeof SERVICE_PAYMENT_METHODS)[number];

export const SERVICE_STATUSES = ["active", "paused", "archived"] as const;
export type ServiceStatus = (typeof SERVICE_STATUSES)[number];

export type DbServiceOffer = {
  id: string;
  creator_id: string | null;
  title: string;
  category: string | null;
  description: string;
  tags: string[] | null;
  price_amount: number | null;
  currency: string;
  price_type: ServicePriceType;
  delivery_time: string | null;
  payment_method: ServicePaymentMethod;
  status: ServiceStatus;
  created_at: string;
  updated_at: string;
};

export type ServiceCreatorProfile = {
  id: string;
  username: string;
  display_name: string | null;
  avatar_url: string | null;
  skills: string[];
  social_links: SocialLinks;
  is_early_contributor: boolean;
};

export type PublicServiceOffer = DbServiceOffer & {
  creator: ServiceCreatorProfile;
};

export const SERVICE_LIST_COLUMNS =
  "id, creator_id, title, category, description, tags, price_amount, currency, price_type, delivery_time, payment_method, status, created_at, updated_at";

export function parseServiceTags(input: string): string[] {
  const seen = new Set<string>();
  const tags: string[] = [];

  for (const raw of input.split(",")) {
    const tag = raw.trim();
    const key = tag.toLowerCase();
    if (!tag || seen.has(key)) continue;
    seen.add(key);
    tags.push(tag);
  }

  return tags.slice(0, 12);
}
