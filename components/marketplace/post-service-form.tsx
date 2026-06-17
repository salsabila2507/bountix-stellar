"use client";

import Link from "next/link";
import { useActionState, useState } from "react";
import {
  CheckCircle2,
  LoaderCircle,
  Save,
  Sparkles,
  TriangleAlert,
} from "lucide-react";
import {
  createServiceAction,
  updateServiceAction,
} from "@/app/services/actions";
import {
  initialServiceFormState,
  type ServiceFormState,
} from "@/lib/service-form-state";
import {
  SERVICE_PAYMENT_METHODS,
  SERVICE_PRICE_TYPES,
  SERVICE_STATUSES,
  type DbServiceOffer,
  type ServicePriceType,
} from "@/lib/services";
import {
  DEFAULT_LOCALE,
  createTranslator,
  type Locale,
  type TranslationKey,
} from "@/lib/i18n";

const input =
  "mt-2 h-12 w-full rounded-lg border-2 border-[#140625] bg-[#fffaf4] px-3 font-medium text-[#140625] placeholder:text-[#5a3b66]/45 outline-none transition focus:bg-white focus:ring-2 focus:ring-[#38e7ff]";

function FieldError({ message }: { message?: string }) {
  if (!message) return null;
  return <p className="mt-2 text-sm font-bold text-[#c42463]">{message}</p>;
}

export function PostServiceForm({
  mode,
  initialService,
  locale = DEFAULT_LOCALE,
}: {
  mode: "create" | "edit";
  initialService?: DbServiceOffer;
  locale?: Locale;
}) {
  const t = createTranslator(locale);
  const boundAction =
    mode === "edit" && initialService
      ? updateServiceAction.bind(null, initialService.id)
      : createServiceAction;
  const [state, formAction, isPending] = useActionState<
    ServiceFormState,
    FormData
  >(boundAction, initialServiceFormState);
  const [priceType, setPriceType] = useState<ServicePriceType>(
    initialService?.price_type ?? "fixed",
  );
  const tagsValue = initialService?.tags?.join(", ") ?? "";

  return (
    <form action={formAction} className="comic-card bg-white p-5 sm:p-6">
      <p className="comic-chip bg-[#38e7ff]">
        {mode === "create"
          ? t("service.form.chipCreate")
          : t("service.form.chipEdit")}
      </p>
      <h1 className="mt-5 text-2xl font-black text-[#140625]">
        {mode === "create"
          ? t("service.form.titleCreate")
          : t("service.form.titleEdit")}
      </h1>
      <p className="mt-3 text-sm font-medium leading-6 text-[#5a3b66]">
        {t("service.form.body")}
      </p>

      {state.status === "error" && state.message ? (
        <div className="mt-6 flex gap-3 rounded-lg border-2 border-[#140625] bg-[#ffe1ed] p-3 text-sm font-bold text-[#8a1742]">
          <TriangleAlert
            aria-hidden="true"
            className="mt-0.5 h-4 w-4 shrink-0"
          />
          <p>{state.message}</p>
        </div>
      ) : null}
      {state.status === "success" ? (
        <div className="mt-6 flex gap-3 rounded-lg border-2 border-[#140625] bg-[#dff7e6] p-3 text-sm font-bold text-[#1f6b3a]">
          <CheckCircle2
            aria-hidden="true"
            className="mt-0.5 h-4 w-4 shrink-0"
          />
          <p>{state.message}</p>
        </div>
      ) : null}

      <div className="mt-6 grid gap-5">
        <label className="block">
          <span className="text-sm font-black text-[#140625]">
            {t("service.form.titleLabel")}
          </span>
          <input
            name="title"
            type="text"
            required
            minLength={4}
            maxLength={140}
            defaultValue={initialService?.title ?? ""}
            placeholder={t("service.form.titlePlaceholder")}
            className={input}
          />
          <FieldError message={state.fieldErrors?.title} />
        </label>

        <label className="block">
          <span className="text-sm font-black text-[#140625]">
            {t("service.form.descriptionLabel")}
          </span>
          <textarea
            name="description"
            rows={7}
            required
            maxLength={4000}
            defaultValue={initialService?.description ?? ""}
            placeholder={t("service.form.descriptionPlaceholder")}
            className="mt-2 w-full rounded-lg border-2 border-[#140625] bg-[#fffaf4] px-3 py-3 font-medium text-[#140625] placeholder:text-[#5a3b66]/45 outline-none transition focus:bg-white focus:ring-2 focus:ring-[#38e7ff]"
          />
          <FieldError message={state.fieldErrors?.description} />
        </label>

        <div className="grid gap-5 sm:grid-cols-2">
          <label className="block">
            <span className="text-sm font-black text-[#140625]">
              {t("service.form.categoryLabel")}{" "}
              <span className="text-[#5a3b66]">{t("common.optional")}</span>
            </span>
            <input
              name="category"
              type="text"
              maxLength={60}
              defaultValue={initialService?.category ?? ""}
              placeholder={t("service.form.categoryPlaceholder")}
              className={input}
            />
            <FieldError message={state.fieldErrors?.category} />
          </label>

          <label className="block">
            <span className="text-sm font-black text-[#140625]">
              {t("service.form.deliveryTime")}{" "}
              <span className="text-[#5a3b66]">{t("common.optional")}</span>
            </span>
            <input
              name="delivery_time"
              type="text"
              maxLength={80}
              defaultValue={initialService?.delivery_time ?? ""}
              placeholder={t("service.form.deliveryPlaceholder")}
              className={input}
            />
            <FieldError message={state.fieldErrors?.delivery_time} />
          </label>
        </div>

        <label className="block">
          <span className="text-sm font-black text-[#140625]">
            {t("service.form.tagsLabel")}{" "}
            <span className="text-[#5a3b66]">{t("common.optional")}</span>
          </span>
          <input
            name="tags"
            type="text"
            maxLength={500}
            defaultValue={tagsValue}
            placeholder={t("service.form.tagsPlaceholder")}
            className={input}
          />
          <p className="mt-2 text-xs font-bold text-[#5a3b66]">
            {t("service.form.tagsHelp")}
          </p>
          <FieldError message={state.fieldErrors?.tags} />
        </label>

        <fieldset className="block">
          <legend className="text-sm font-black text-[#140625]">
            {t("service.form.priceType")}
          </legend>
          <div className="mt-3 grid gap-3 sm:grid-cols-2">
            {SERVICE_PRICE_TYPES.map((type, i) => (
              <label
                key={type}
                className="flex cursor-pointer items-start gap-3 rounded-lg border-2 border-[#140625] bg-[#fffaf4] p-3 shadow-[3px_3px_0_#140625] transition hover:bg-white has-[:checked]:bg-[#ffdd3d]"
              >
                <input
                  type="radio"
                  name="price_type"
                  value={type}
                  defaultChecked={
                    initialService?.price_type
                      ? initialService.price_type === type
                      : i === 0
                  }
                  onChange={() => setPriceType(type)}
                  className="mt-1 h-4 w-4 accent-[#7c3cff]"
                />
                <span className="text-sm font-black text-[#140625]">
                  {t(`service.price.${type}` as TranslationKey)}
                  <span className="mt-1 block text-xs font-bold text-[#5a3b66]">
                    {type === "fixed"
                      ? t("service.form.fixedHelp")
                      : t("service.form.negotiableHelp")}
                  </span>
                </span>
              </label>
            ))}
          </div>
          <FieldError message={state.fieldErrors?.price_type} />
        </fieldset>

        <label className="block">
          <span className="text-sm font-black text-[#140625]">
            {t("service.form.priceAmount")}{" "}
            {priceType === "negotiable" ? (
              <span className="text-[#5a3b66]">{t("common.optional")}</span>
            ) : null}
          </span>
          <input
            name="price_amount"
            type="number"
            required={priceType === "fixed"}
            min="0.01"
            step="0.01"
            defaultValue={initialService?.price_amount ?? ""}
            placeholder="100.00"
            className={input}
          />
          <FieldError message={state.fieldErrors?.price_amount} />
        </label>

        <fieldset className="block">
          <legend className="text-sm font-black text-[#140625]">
            {t("service.form.paymentMethod")}
          </legend>
          <div className="mt-3 grid gap-3 sm:grid-cols-2">
            {SERVICE_PAYMENT_METHODS.map((method, i) => (
              <label
                key={method}
                className="flex cursor-pointer items-start gap-3 rounded-lg border-2 border-[#140625] bg-[#fffaf4] p-3 shadow-[3px_3px_0_#140625] transition hover:bg-white has-[:checked]:bg-[#38e7ff]"
              >
                <input
                  type="radio"
                  name="payment_method"
                  value={method}
                  defaultChecked={
                    initialService?.payment_method
                      ? initialService.payment_method === method
                      : i === 0
                  }
                  className="mt-1 h-4 w-4 accent-[#7c3cff]"
                />
                <span className="text-sm font-black text-[#140625]">
                  {t(`service.payment.${method}` as TranslationKey)}
                  <span className="mt-1 block text-xs font-bold text-[#5a3b66]">
                    {method === "escrow_stellar"
                      ? t("service.payment.escrowCopy")
                      : t("service.payment.manualCopy")}
                  </span>
                </span>
              </label>
            ))}
          </div>
          <FieldError message={state.fieldErrors?.payment_method} />
        </fieldset>

        {mode === "edit" ? (
          <label className="block">
            <span className="text-sm font-black text-[#140625]">
              {t("service.form.status")}
            </span>
            <select
              name="status"
              defaultValue={initialService?.status ?? "active"}
              className="mt-2 h-12 w-full rounded-lg border-2 border-[#140625] bg-[#fffaf4] px-3 font-bold text-[#140625] outline-none focus:bg-white focus:ring-2 focus:ring-[#38e7ff]"
            >
              {SERVICE_STATUSES.map((status) => (
                <option key={status} value={status}>
                  {t(`service.status.${status}` as TranslationKey)}
                </option>
              ))}
            </select>
            <FieldError message={state.fieldErrors?.status} />
          </label>
        ) : (
          <input type="hidden" name="status" value="active" />
        )}

        <div className="rounded-lg border-2 border-dashed border-[#140625] bg-[#f2e6ff] p-4 text-sm font-bold text-[#3c214b]">
          <Sparkles
            aria-hidden="true"
            className="mr-2 inline h-4 w-4 text-[#7c3cff]"
          />
          {t("service.form.paymentNote")}
        </div>
      </div>

      <div className="mt-6 flex flex-wrap gap-3">
        <button
          type="submit"
          disabled={isPending}
          className="inline-flex min-h-12 items-center justify-center gap-2 rounded-lg border-2 border-[#140625] bg-[#ff4fb8] px-5 py-3 text-sm font-black uppercase text-white shadow-[5px_5px_0_#140625] transition hover:-translate-y-0.5 hover:bg-[#7c3cff] disabled:cursor-not-allowed disabled:bg-[#c9c0d3] disabled:text-[#5a3b66]"
        >
          {isPending ? (
            <>
              <LoaderCircle
                aria-hidden="true"
                className="h-4 w-4 animate-spin"
              />
              {mode === "create"
                ? t("service.form.posting")
                : t("common.saving")}
            </>
          ) : (
            <>
              <Save aria-hidden="true" className="h-4 w-4" />
              {mode === "create"
                ? t("service.form.post")
                : t("common.saveChanges")}
            </>
          )}
        </button>
        <Link
          href="/dashboard/services"
          className="inline-flex min-h-12 items-center justify-center gap-2 rounded-lg border-2 border-[#140625] bg-white px-5 py-3 text-sm font-black uppercase text-[#140625] shadow-[5px_5px_0_#140625] transition hover:-translate-y-0.5 hover:bg-[#38e7ff]"
        >
          {t("common.cancel")}
        </Link>
      </div>
    </form>
  );
}
