import type { Metadata } from "next";
import {
  TrustPage,
  type TrustPageLink,
  type TrustPageSection,
} from "@/components/trust-page";
import { createTranslator } from "@/lib/i18n";
import { getRequestLocale } from "@/lib/i18n/server";

const sections = [
  {
    titleKey: "legal.contact.safety.title",
    bodyKey: "legal.contact.safety.body",
  },
] satisfies TrustPageSection[];

const links = [
  {
    href: "https://www.bountix.xyz",
    labelKey: "footer.website",
    bodyKey: "legal.contact.website.body",
    external: true,
  },
  {
    href: "https://t.me/invisiblefoxyasuo",
    labelKey: "legal.contact.telegram.label",
    bodyKey: "legal.contact.telegram.body",
    external: true,
  },
  {
    href: "https://x.com/Bountixofc",
    labelKey: "footer.x",
    bodyKey: "legal.contact.x.body",
    external: true,
  },
  {
    href: "https://x.com/calbuldelis69",
    labelKey: "footer.builderX",
    bodyKey: "legal.contact.builderX.body",
    external: true,
  },
] satisfies TrustPageLink[];

export async function generateMetadata(): Promise<Metadata> {
  const locale = await getRequestLocale();
  const t = createTranslator(locale);

  return {
    title: t("legal.contact.metaTitle"),
    description: t("legal.contact.metaDescription"),
  };
}

export default async function ContactPage() {
  const locale = await getRequestLocale();

  return (
    <TrustPage
      locale={locale}
      chipKey="legal.contact.chip"
      titleKey="legal.contact.title"
      introKey="legal.contact.intro"
      sections={sections}
      links={links}
    />
  );
}
