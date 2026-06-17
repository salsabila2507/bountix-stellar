"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { Languages } from "lucide-react";
import {
  LOCALE_COOKIE,
  LOCALE_LABEL,
  LOCALE_STORAGE_KEY,
  LOCALES,
  createTranslator,
  resolveLocale,
  type Locale,
} from "@/lib/i18n";

type LanguageSwitcherProps = {
  locale: Locale;
  className?: string;
};

export function LanguageSwitcher({
  locale,
  className = "",
}: LanguageSwitcherProps) {
  const router = useRouter();
  const t = createTranslator(locale);

  useEffect(() => {
    const rawStored = window.localStorage.getItem(LOCALE_STORAGE_KEY);
    if (rawStored) {
      const stored = resolveLocale(rawStored);
      if (stored === locale) {
        document.documentElement.lang = locale;
        return;
      }
      document.cookie = `${LOCALE_COOKIE}=${stored}; path=/; max-age=31536000; samesite=lax`;
      document.documentElement.lang = stored;
      router.refresh();
      return;
    }
    document.documentElement.lang = locale;
  }, [locale, router]);

  function handleChange(nextLocale: Locale) {
    window.localStorage.setItem(LOCALE_STORAGE_KEY, nextLocale);
    document.cookie = `${LOCALE_COOKIE}=${nextLocale}; path=/; max-age=31536000; samesite=lax`;
    document.documentElement.lang = nextLocale;
    router.refresh();
  }

  return (
    <label
      className={`inline-flex min-h-10 items-center gap-2 rounded-lg border-2 border-[#140625] bg-white px-2.5 py-2 text-xs font-black uppercase text-[#140625] shadow-[3px_3px_0_#140625] ${className}`}
    >
      <Languages aria-hidden="true" className="h-4 w-4 text-[#7c3cff]" />
      <span className="sr-only">{t("language.label")}</span>
      <select
        defaultValue={locale}
        aria-label={t("language.label")}
        onChange={(event) => handleChange(resolveLocale(event.target.value))}
        className="bg-transparent font-black uppercase outline-none"
      >
        {LOCALES.map((option) => (
          <option key={option} value={option}>
            {LOCALE_LABEL[option]}
          </option>
        ))}
      </select>
    </label>
  );
}
