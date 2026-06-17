"use client";

import { useActionState } from "react";
import {
  CheckCircle2,
  LoaderCircle,
  Send,
  TriangleAlert,
} from "lucide-react";
import { applyToTaskAction } from "@/app/applications/actions";
import {
  initialApplyState,
  type ApplyState,
} from "@/lib/application-form-state";
import {
  DEFAULT_LOCALE,
  createTranslator,
  type Locale,
} from "@/lib/i18n";

export function ApplyForm({
  taskId,
  locale = DEFAULT_LOCALE,
}: {
  taskId: string;
  locale?: Locale;
}) {
  const t = createTranslator(locale);
  const action = applyToTaskAction.bind(null, taskId);
  const [state, formAction, isPending] = useActionState<ApplyState, FormData>(
    action,
    initialApplyState,
  );

  if (state.status === "success") {
    return (
      <div className="comic-card-soft bg-[#dff7e6] p-5">
        <CheckCircle2
          aria-hidden="true"
          className="h-5 w-5 text-[#1f6b3a]"
        />
        <p className="mt-2 text-sm font-black leading-6 text-[#140625]">
          {state.message}
        </p>
        <p className="mt-2 text-xs font-bold leading-5 text-[#3c214b]">
          {t("form.apply.successTrack")}
        </p>
      </div>
    );
  }

  return (
    <form action={formAction} className="comic-card-soft bg-white p-5">
      <h2 className="text-lg font-black text-[#140625]">
        {t("form.apply.title")}
      </h2>
      <p className="mt-2 text-sm font-semibold leading-6 text-[#5a3b66]">
        {t("form.apply.body")}
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

      <label className="mt-4 block">
        <span className="text-sm font-black text-[#140625]">
          {t("form.apply.pitch")}{" "}
          <span className="text-[#5a3b66]">
            {t("form.apply.pitchMeta")}
          </span>
        </span>
        <textarea
          name="message"
          rows={4}
          maxLength={1000}
          placeholder={t("form.apply.placeholder")}
          className="mt-2 w-full rounded-lg border-2 border-[#140625] bg-[#fffaf4] px-3 py-3 font-medium text-[#140625] placeholder:text-[#5a3b66]/45 outline-none transition focus:bg-white focus:ring-2 focus:ring-[#38e7ff]"
        />
      </label>

      <button
        type="submit"
        disabled={isPending}
        className="mt-4 inline-flex min-h-11 w-full items-center justify-center gap-2 rounded-lg border-2 border-[#140625] bg-[#ff4fb8] px-4 text-sm font-black uppercase text-white shadow-[4px_4px_0_#140625] transition hover:-translate-y-0.5 hover:bg-[#7c3cff] disabled:cursor-not-allowed disabled:bg-[#c9c0d3] disabled:text-[#5a3b66]"
      >
        {isPending ? (
          <>
            <LoaderCircle aria-hidden="true" className="h-4 w-4 animate-spin" />
            {t("form.apply.sending")}
          </>
        ) : (
          <>
            <Send aria-hidden="true" className="h-4 w-4" />
            {t("form.apply.send")}
          </>
        )}
      </button>
    </form>
  );
}
