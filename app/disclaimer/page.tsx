import type { Metadata } from "next";
import { TrustPage, type TrustPageSection } from "@/components/trust-page";
import { createTranslator } from "@/lib/i18n";
import { getRequestLocale } from "@/lib/i18n/server";

const sections = [
  {
    titleKey: "legal.disclaimer.financial.title",
    bodyKey: "legal.disclaimer.financial.body",
  },
  {
    titleKey: "legal.disclaimer.token.title",
    bodyKey: "legal.disclaimer.token.body",
  },
  {
    titleKey: "legal.disclaimer.income.title",
    bodyKey: "legal.disclaimer.income.body",
  },
  {
    titleKey: "legal.disclaimer.crypto.title",
    bodyKey: "legal.disclaimer.crypto.body",
    variant: "warning",
  },
  {
    titleKey: "legal.disclaimer.manual.title",
    bodyKey: "legal.disclaimer.manual.body",
    variant: "warning",
  },
  {
    titleKey: "legal.disclaimer.escrow.title",
    bodyKey: "legal.disclaimer.escrow.body",
  },
  {
    titleKey: "legal.disclaimer.wallet.title",
    bodyKey: "legal.disclaimer.wallet.body",
    variant: "warning",
  },
] satisfies TrustPageSection[];

export async function generateMetadata(): Promise<Metadata> {
  const locale = await getRequestLocale();
  const t = createTranslator(locale);

  return {
    title: t("legal.disclaimer.metaTitle"),
    description: t("legal.disclaimer.metaDescription"),
  };
}

export default async function DisclaimerPage() {
  const locale = await getRequestLocale();

  return (
    <TrustPage
      locale={locale}
      chipKey="legal.disclaimer.chip"
      titleKey="legal.disclaimer.title"
      introKey="legal.disclaimer.intro"
      sections={sections}
    />
  );
}
