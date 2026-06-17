import type { Metadata } from "next";
import { TrustPage, type TrustPageSection } from "@/components/trust-page";
import { createTranslator } from "@/lib/i18n";
import { getRequestLocale } from "@/lib/i18n/server";

const sections = [
  {
    titleKey: "legal.privacy.data.title",
    bodyKey: "legal.privacy.data.body",
  },
  {
    titleKey: "legal.privacy.wallet.title",
    bodyKey: "legal.privacy.wallet.body",
  },
  {
    titleKey: "legal.privacy.keys.title",
    bodyKey: "legal.privacy.keys.body",
  },
  {
    titleKey: "legal.privacy.activity.title",
    bodyKey: "legal.privacy.activity.body",
  },
  {
    titleKey: "legal.privacy.contact.title",
    bodyKey: "legal.privacy.contact.body",
  },
] satisfies TrustPageSection[];

export async function generateMetadata(): Promise<Metadata> {
  const locale = await getRequestLocale();
  const t = createTranslator(locale);

  return {
    title: t("legal.privacy.metaTitle"),
    description: t("legal.privacy.metaDescription"),
  };
}

export default async function PrivacyPage() {
  const locale = await getRequestLocale();

  return (
    <TrustPage
      locale={locale}
      chipKey="legal.privacy.chip"
      titleKey="legal.privacy.title"
      introKey="legal.privacy.intro"
      sections={sections}
    />
  );
}
