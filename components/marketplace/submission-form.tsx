import Link from "next/link";
import { Hourglass } from "lucide-react";
import {
  DEFAULT_LOCALE,
  createTranslator,
  type Locale,
} from "@/lib/i18n";

export function SubmissionForm({
  locale = DEFAULT_LOCALE,
}: {
  locale?: Locale;
}) {
  const t = createTranslator(locale);

  return (
    <div className="rounded-lg border-2 border-[#140625] bg-white p-5 text-[#140625] shadow-[6px_6px_0_#140625]">
      <p className="comic-chip bg-[#38e7ff]">
        {t("form.submissionPreview.chip")}
      </p>
      <h3 className="mt-4 text-xl font-black text-[#140625]">
        {t("form.submissionPreview.title")}
      </h3>
      <p className="mt-3 text-sm font-semibold leading-6 text-[#5a3b66]">
        {t("form.submissionPreview.body")}
      </p>

      <div className="mt-5 grid gap-4">
        <label className="block">
          <span className="text-sm font-black text-[#140625]">
            {t("form.submit.delivery")}
          </span>
          <input
            type="url"
            placeholder="https://..."
            disabled
            aria-disabled="true"
            className="mt-2 h-12 w-full cursor-not-allowed rounded-lg border-2 border-dashed border-[#140625]/50 bg-[#fffaf4] px-3 font-semibold text-[#140625] placeholder:text-[#5a3b66]/50 outline-none"
          />
        </label>
        <label className="block">
          <span className="text-sm font-black text-[#140625]">
            {t("form.submit.notes")}
          </span>
          <textarea
            rows={4}
            placeholder={t("form.submissionPreview.notesPlaceholder")}
            disabled
            aria-disabled="true"
            className="mt-2 w-full cursor-not-allowed rounded-lg border-2 border-dashed border-[#140625]/50 bg-[#fffaf4] px-3 py-3 font-semibold text-[#140625] placeholder:text-[#5a3b66]/50 outline-none"
          />
        </label>
      </div>

      <button
        type="button"
        disabled
        aria-disabled="true"
        title="Open a real task to submit work"
        className="mt-5 inline-flex min-h-11 w-full cursor-not-allowed items-center justify-center gap-2 rounded-lg border-2 border-[#140625] bg-[#f1d8ff] px-4 text-sm font-black uppercase text-[#140625] shadow-[4px_4px_0_#140625] opacity-90"
      >
        <Hourglass aria-hidden="true" className="h-4 w-4 text-[#7c3cff]" />
        {t("form.submissionPreview.earlyOnly")}
      </button>

      <Link
        href="/signup"
        className="mt-3 inline-flex min-h-11 w-full items-center justify-center gap-2 rounded-lg border-2 border-[#140625] bg-[#ff4fb8] px-4 text-sm font-black uppercase text-white shadow-[4px_4px_0_#140625] transition hover:-translate-y-0.5 hover:bg-[#7c3cff]"
      >
        {t("form.submissionPreview.join")}
      </Link>
    </div>
  );
}
