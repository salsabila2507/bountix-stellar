import type { Metadata } from "next";
import { TrustPage, type TrustPageSection } from "@/components/trust-page";
import { createTranslator } from "@/lib/i18n";
import { getRequestLocale } from "@/lib/i18n/server";

const allowedItems = [
  "legal.taskPolicy.allowed.research",
  "legal.taskPolicy.allowed.content",
  "legal.taskPolicy.allowed.design",
  "legal.taskPolicy.allowed.testing",
  "legal.taskPolicy.allowed.community",
  "legal.taskPolicy.allowed.outreach",
  "legal.taskPolicy.allowed.creator",
  "legal.taskPolicy.allowed.social",
  "legal.taskPolicy.allowed.unusual",
  "legal.taskPolicy.allowed.smallWork",
] as const;

const prohibitedItems = [
  "legal.taskPolicy.prohibited.illegal",
  "legal.taskPolicy.prohibited.scams",
  "legal.taskPolicy.prohibited.drainer",
  "legal.taskPolicy.prohibited.seed",
  "legal.taskPolicy.prohibited.impersonation",
  "legal.taskPolicy.prohibited.stealing",
  "legal.taskPolicy.prohibited.harassment",
  "legal.taskPolicy.prohibited.adult",
  "legal.taskPolicy.prohibited.violence",
  "legal.taskPolicy.prohibited.regulated",
  "legal.taskPolicy.prohibited.financialScams",
  "legal.taskPolicy.prohibited.platformAbuse",
  "legal.taskPolicy.prohibited.risk",
] as const;

const sections = [
  {
    titleKey: "legal.taskPolicy.allowed.title",
    bodyKey: "legal.taskPolicy.allowed.body",
    items: allowedItems,
  },
  {
    titleKey: "legal.taskPolicy.prohibited.title",
    bodyKey: "legal.taskPolicy.prohibited.body",
    items: prohibitedItems,
    variant: "warning",
  },
  {
    titleKey: "legal.taskPolicy.review.title",
    bodyKey: "legal.taskPolicy.review.body",
  },
] satisfies TrustPageSection[];

export async function generateMetadata(): Promise<Metadata> {
  const locale = await getRequestLocale();
  const t = createTranslator(locale);

  return {
    title: t("legal.taskPolicy.metaTitle"),
    description: t("legal.taskPolicy.metaDescription"),
  };
}

export default async function TaskPolicyPage() {
  const locale = await getRequestLocale();

  return (
    <TrustPage
      locale={locale}
      chipKey="legal.taskPolicy.chip"
      titleKey="legal.taskPolicy.title"
      introKey="legal.taskPolicy.intro"
      sections={sections}
    />
  );
}
