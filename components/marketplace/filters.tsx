import { Search, SlidersHorizontal } from "lucide-react";
import { cn } from "@/lib/utils";
import {
  DEFAULT_LOCALE,
  createTranslator,
  type Locale,
  type TranslationKey,
} from "@/lib/i18n";

const taskFilters = [
  "common.all",
  "market.filters.escrow",
  "market.filters.regular",
  "market.filters.negotiable",
  "market.filters.open",
] satisfies TranslationKey[];
const creatorFilters = [
  "common.all",
  "market.filters.research",
  "market.filters.growth",
  "market.filters.designQa",
  "market.filters.escrowReady",
] satisfies TranslationKey[];
const filterColors = [
  "bg-[#ff4fb8] text-white",
  "bg-[#ffdd3d] text-[#140625]",
  "bg-[#38e7ff] text-[#140625]",
  "bg-[#f1d8ff] text-[#140625]",
  "bg-white text-[#140625]",
];

function FilterShell({
  labelKey,
  filters,
  locale,
}: {
  labelKey: TranslationKey;
  filters: TranslationKey[];
  locale: Locale;
}) {
  const t = createTranslator(locale);

  return (
    <div className="rounded-lg border-2 border-[#140625] bg-[#fffaf4] p-4 shadow-[6px_6px_0_#140625]">
      <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
        <label className="relative block lg:min-w-[320px]">
          <Search
            aria-hidden="true"
            className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-[#7c3cff]"
          />
          <input
            type="search"
            placeholder={t(labelKey)}
            className="h-11 w-full rounded-lg border-2 border-[#140625] bg-white pl-10 pr-3 text-sm font-bold text-[#140625] placeholder:text-[#5a3b66]/50 outline-none transition focus:bg-[#fff8ed] focus:ring-2 focus:ring-[#38e7ff]"
          />
        </label>
        <div className="flex flex-wrap gap-2">
          {filters.map((filterKey, index) => (
            <button
              key={filterKey}
              type="button"
              className={cn(
                "inline-flex min-h-10 items-center gap-2 rounded-lg border-2 border-[#140625] px-3 text-sm font-black shadow-[3px_3px_0_#140625] transition hover:-translate-y-0.5",
                filterColors[index % filterColors.length],
              )}
            >
              {filterKey === "common.all" ? (
                <SlidersHorizontal
                  aria-hidden="true"
                  className="h-3.5 w-3.5"
                />
              ) : null}
              {t(filterKey)}
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}

export function TaskFilters({
  locale = DEFAULT_LOCALE,
}: {
  locale?: Locale;
}) {
  return (
    <FilterShell
      labelKey="market.filters.searchTasks"
      filters={taskFilters}
      locale={locale}
    />
  );
}

export function CreatorFilters({
  locale = DEFAULT_LOCALE,
}: {
  locale?: Locale;
}) {
  return (
    <FilterShell
      labelKey="market.filters.searchCreators"
      filters={creatorFilters}
      locale={locale}
    />
  );
}
