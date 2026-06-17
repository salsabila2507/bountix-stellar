import Link from "next/link";
import {
  ArrowRight,
  ArrowUpRight,
  CheckCircle2,
  ShieldAlert,
} from "lucide-react";
import { SiteHeader } from "@/components/site-header";
import {
  createTranslator,
  type Locale,
  type TranslationKey,
} from "@/lib/i18n";

type SectionVariant = "default" | "warning";

export type TrustPageSection = {
  titleKey: TranslationKey;
  bodyKey?: TranslationKey;
  items?: readonly TranslationKey[];
  variant?: SectionVariant;
};

export type TrustPageLink = {
  href: string;
  labelKey: TranslationKey;
  bodyKey: TranslationKey;
  external?: boolean;
};

type TrustPageProps = {
  locale: Locale;
  chipKey: TranslationKey;
  titleKey: TranslationKey;
  introKey: TranslationKey;
  sections: readonly TrustPageSection[];
  links?: readonly TrustPageLink[];
};

export function TrustPage({
  locale,
  chipKey,
  titleKey,
  introKey,
  sections,
  links,
}: TrustPageProps) {
  const t = createTranslator(locale);

  return (
    <main className="comic-page min-h-screen overflow-hidden text-[#140625]">
      <SiteHeader />
      <section className="container-page py-8 sm:py-12">
        <div className="comic-card relative overflow-hidden bg-[#fff8ed] p-6 sm:p-10">
          <div className="halftone-mask absolute inset-0 opacity-15" />
          <div className="absolute -right-10 -top-10 h-40 w-40 rounded-full border-2 border-[#140625] bg-[#38e7ff]/60" />
          <div className="relative max-w-4xl">
            <p className="comic-chip bg-[#ffdd3d]">{t(chipKey)}</p>
            <h1 className="mt-5 text-4xl font-black uppercase leading-[0.95] sm:text-6xl">
              {t(titleKey)}
            </h1>
            <p className="mt-5 max-w-3xl text-base font-semibold leading-8 text-[#3c214b] sm:text-lg">
              {t(introKey)}
            </p>
            <p className="mt-5 inline-flex rounded-lg border-2 border-[#140625] bg-white px-3 py-2 text-xs font-black uppercase text-[#5a3b66] shadow-[3px_3px_0_#140625]">
              {t("legal.common.lastUpdated")}
            </p>
          </div>
        </div>

        <div className="mt-8 grid gap-4 lg:grid-cols-2">
          {sections.map((section) => (
            <article
              key={section.titleKey}
              className="comic-card-soft bg-white p-5"
            >
              <h2 className="text-xl font-black uppercase">
                {t(section.titleKey)}
              </h2>
              {section.bodyKey ? (
                <p className="mt-3 text-sm font-semibold leading-7 text-[#5a3b66]">
                  {t(section.bodyKey)}
                </p>
              ) : null}
              {section.items ? (
                <ul className="mt-4 grid gap-2">
                  {section.items.map((itemKey) => (
                    <li
                      key={itemKey}
                      className="flex gap-2 text-sm font-semibold leading-6 text-[#3c214b]"
                    >
                      <span
                        className={`mt-0.5 inline-flex h-5 w-5 shrink-0 items-center justify-center rounded-md border-2 border-[#140625] ${
                          section.variant === "warning"
                            ? "bg-[#ffdd3d]"
                            : "bg-[#38e7ff]"
                        }`}
                      >
                        {section.variant === "warning" ? (
                          <ShieldAlert
                            aria-hidden="true"
                            className="h-3.5 w-3.5"
                          />
                        ) : (
                          <CheckCircle2
                            aria-hidden="true"
                            className="h-3.5 w-3.5"
                          />
                        )}
                      </span>
                      {t(itemKey)}
                    </li>
                  ))}
                </ul>
              ) : null}
            </article>
          ))}
        </div>

        {links ? (
          <section className="comic-card-soft mt-8 bg-[#f2e6ff] p-5 sm:p-6">
            <h2 className="text-xl font-black uppercase">
              {t("legal.common.officialLinks")}
            </h2>
            <div className="mt-4 grid gap-3 md:grid-cols-3">
              {links.map((link) => (
                <Link
                  key={link.href}
                  href={link.href}
                  target={link.external ? "_blank" : undefined}
                  rel={link.external ? "noreferrer" : undefined}
                  className="rounded-lg border-2 border-[#140625] bg-white p-4 shadow-[4px_4px_0_#140625] transition hover:-translate-y-0.5 hover:bg-[#38e7ff]"
                >
                  <span className="inline-flex items-center gap-2 text-sm font-black uppercase">
                    {t(link.labelKey)}
                    {link.external ? (
                      <ArrowUpRight
                        aria-hidden="true"
                        className="h-4 w-4"
                      />
                    ) : (
                      <ArrowRight aria-hidden="true" className="h-4 w-4" />
                    )}
                  </span>
                  <span className="mt-2 block text-sm font-semibold leading-6 text-[#5a3b66]">
                    {t(link.bodyKey)}
                  </span>
                </Link>
              ))}
            </div>
          </section>
        ) : null}
      </section>
    </main>
  );
}
