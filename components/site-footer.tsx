import Link from "next/link";
import { ArrowUpRight } from "lucide-react";
import { createTranslator, type TranslationKey } from "@/lib/i18n";
import { getRequestLocale } from "@/lib/i18n/server";

type FooterLink = {
  href: string;
  labelKey: TranslationKey;
  external?: boolean;
};

const trustLinks = [
  { href: "/privacy", labelKey: "footer.privacy" },
  { href: "/terms", labelKey: "footer.terms" },
  { href: "/disclaimer", labelKey: "footer.disclaimer" },
  { href: "/task-policy", labelKey: "footer.taskPolicy" },
  { href: "/contact", labelKey: "footer.contact" },
] satisfies FooterLink[];

const officialLinks = [
  { href: "https://www.bountix.xyz", labelKey: "footer.website", external: true },
  { href: "https://x.com/Bountixofc", labelKey: "footer.x", external: true },
  {
    href: "https://x.com/calbuldelis69",
    labelKey: "footer.builderX",
    external: true,
  },
] satisfies FooterLink[];

export async function SiteFooter() {
  const locale = await getRequestLocale();
  const t = createTranslator(locale);

  return (
    <footer className="border-t-2 border-[#140625] bg-[#fffaf4] text-[#140625]">
      <div className="container-page grid gap-8 py-8 sm:grid-cols-[1.2fr_2fr] sm:py-10">
        <div>
          <Link
            href="/"
            className="text-lg font-black uppercase tracking-normal text-[#140625]"
          >
            Bountix
          </Link>
          <p className="mt-3 max-w-md text-sm font-bold leading-6 text-[#5a3b66]">
            {t("footer.tagline")}
          </p>
        </div>
        <div className="grid gap-6 sm:grid-cols-2">
          <div>
            <h2 className="text-xs font-black uppercase text-[#5a3b66]">
              {t("footer.trustLegal")}
            </h2>
            <nav className="mt-3 flex flex-wrap gap-2 text-sm font-black">
              {trustLinks.map((link) => (
                <Link
                  key={link.href}
                  href={link.href}
                  className="rounded-lg px-2 py-1 transition hover:bg-[#38e7ff]"
                >
                  {t(link.labelKey)}
                </Link>
              ))}
            </nav>
          </div>
          <div>
            <h2 className="text-xs font-black uppercase text-[#5a3b66]">
              {t("footer.officialLinks")}
            </h2>
            <nav className="mt-3 flex flex-wrap gap-2 text-sm font-black">
              {officialLinks.map((link) => (
                <Link
                  key={link.href}
                  href={link.href}
                  target="_blank"
                  rel="noreferrer"
                  className="inline-flex items-center gap-1.5 rounded-lg px-2 py-1 transition hover:bg-[#ffdd3d]"
                >
                  {t(link.labelKey)}
                  <ArrowUpRight aria-hidden="true" className="h-3.5 w-3.5" />
                </Link>
              ))}
            </nav>
          </div>
        </div>
      </div>
    </footer>
  );
}
