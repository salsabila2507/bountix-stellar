import type { Metadata } from "next";
import { TrustPage, type TrustPageSection } from "@/components/trust-page";
import { createTranslator } from "@/lib/i18n";
import { getRequestLocale } from "@/lib/i18n/server";

const sections = [
  {
    titleKey: "legal.terms.earlyAccess.title",
    bodyKey: "legal.terms.earlyAccess.body",
  },
  {
    titleKey: "legal.terms.responsibility.title",
    bodyKey: "legal.terms.responsibility.body",
  },
  {
    titleKey: "legal.terms.taskRemoval.title",
    bodyKey: "legal.terms.taskRemoval.body",
  },
  {
    titleKey: "legal.terms.accountLimits.title",
    bodyKey: "legal.terms.accountLimits.body",
  },
  {
    titleKey: "legal.terms.manualPayments.title",
    bodyKey: "legal.terms.manualPayments.body",
  },
  {
    titleKey: "legal.terms.escrowFlow.title",
    bodyKey: "legal.terms.escrowFlow.body",
  },
  {
    titleKey: "legal.terms.policy.title",
    bodyKey: "legal.terms.policy.body",
    variant: "warning",
  },
] satisfies TrustPageSection[];

export async function generateMetadata(): Promise<Metadata> {
  const locale = await getRequestLocale();
  const t = createTranslator(locale);

  return {
    title: t("legal.terms.metaTitle"),
    description: t("legal.terms.metaDescription"),
  };
}

export default async function TermsPage() {
  const locale = await getRequestLocale();

  return (
    <TrustPage
      locale={locale}
      chipKey="legal.terms.chip"
      titleKey="legal.terms.title"
      introKey="legal.terms.intro"
      sections={sections}
    />
  );
}
