"use client";

import { useActionState } from "react";
import {
  CheckCircle2,
  LoaderCircle,
  Send,
  TriangleAlert,
} from "lucide-react";
import { createSubmissionAction } from "@/app/applications/actions";
import {
  initialSubmitState,
  type SubmitState,
} from "@/lib/application-form-state";
import {
  DEFAULT_LOCALE,
  createTranslator,
  type Locale,
} from "@/lib/i18n";

function FieldError({ message }: { message?: string }) {
  if (!message) return null;
  return <p className="mt-2 text-sm font-bold text-[#c42463]">{message}</p>;
}

export function SubmitWorkForm({
  applicationId,
  locale = DEFAULT_LOCALE,
}: {
  applicationId: string;
  locale?: Locale;
}) {
  const t = createTranslator(locale);
  const action = createSubmissionAction.bind(null, applicationId);
  const [state, formAction, isPending] = useActionState<SubmitState, FormData>(
    action,
    initialSubmitState,
  );

  return (
    <form action={formAction} className="comic-card-soft bg-white p-5">
      <h2 className="text-lg font-black text-[#140625]">
        {t("form.submit.title")}
      </h2>
      <p className="mt-2 text-sm font-semibold leading-6 text-[#5a3b66]">
        {t("form.submit.body")}
      </p>

      {state.status === "error" && state.message ? (
        <div className="mt-4 flex gap-3 rounded-lg border-2 border-[#140625] bg-[#ffe1ed] p-3 text-sm font-bold text-[#8a1742]">
          <TriangleAlert
            aria-hidden="true"
            className="mt-0.5 h-4 w-4 shrink-0"
          />
          <p>{state.message}</p>
        </div>
      ) : null}
      {state.status === "success" ? (
        <div className="mt-4 flex gap-3 rounded-lg border-2 border-[#140625] bg-[#dff7e6] p-3 text-sm font-bold text-[#1f6b3a]">
          <CheckCircle2
            aria-hidden="true"
            className="mt-0.5 h-4 w-4 shrink-0"
          />
          <p>{state.message}</p>
        </div>
      ) : null}

      <label className="mt-4 block">
        <span className="text-sm font-black text-[#140625]">
          {t("form.submit.delivery")}
        </span>
        <input
          name="delivery_url"
          type="url"
          required
          maxLength={500}
          placeholder="https://..."
          className="mt-2 h-12 w-full rounded-lg border-2 border-[#140625] bg-[#fffaf4] px-3 font-medium text-[#140625] placeholder:text-[#5a3b66]/45 outline-none transition focus:bg-white focus:ring-2 focus:ring-[#38e7ff]"
        />
        <FieldError message={state.fieldErrors?.delivery_url} />
      </label>

      <label className="mt-4 block">
        <span className="text-sm font-black text-[#140625]">
          {t("form.submit.notes")}{" "}
          <span className="text-[#5a3b66]">{t("common.optional")}</span>
        </span>
        <textarea
          name="notes"
          rows={4}
          maxLength={2000}
          placeholder={t("form.submit.notesPlaceholder")}
          className="mt-2 w-full rounded-lg border-2 border-[#140625] bg-[#fffaf4] px-3 py-3 font-medium text-[#140625] placeholder:text-[#5a3b66]/45 outline-none transition focus:bg-white focus:ring-2 focus:ring-[#38e7ff]"
        />
        <FieldError message={state.fieldErrors?.notes} />
      </label>

      <button
        type="submit"
        disabled={isPending}
        className="mt-4 inline-flex min-h-11 w-full items-center justify-center gap-2 rounded-lg border-2 border-[#140625] bg-[#ff4fb8] px-4 text-sm font-black uppercase text-white shadow-[4px_4px_0_#140625] transition hover:-translate-y-0.5 hover:bg-[#7c3cff] disabled:cursor-not-allowed disabled:bg-[#c9c0d3] disabled:text-[#5a3b66]"
      >
        {isPending ? (
          <>
            <LoaderCircle aria-hidden="true" className="h-4 w-4 animate-spin" />
            {t("form.submit.submitting")}
          </>
        ) : (
          <>
            <Send aria-hidden="true" className="h-4 w-4" />
            {t("form.submit.submit")}
          </>
        )}
      </button>
    </form>
  );
}
