"use client";

import Link from "next/link";
import { useActionState } from "react";
import { CheckCircle2, LoaderCircle, Save, TriangleAlert } from "lucide-react";
import { saveProfileAction } from "@/app/dashboard/profile/edit/actions";
import {
  initialProfileEditState,
  type ProfileEditState,
} from "@/lib/profile-edit-state";
import {
  PROFILE_LANGUAGES,
  PROFILE_LANGUAGE_LABEL,
  type Profile,
} from "@/lib/profile";

function FieldError({ message }: { message?: string }) {
  if (!message) return null;
  return <p className="mt-2 text-sm font-bold text-[#c42463]">{message}</p>;
}

const inputClass =
  "mt-2 h-12 w-full rounded-lg border-2 border-[#140625] bg-[#fffaf4] px-3 font-medium text-[#140625] placeholder:text-[#5a3b66]/45 outline-none transition focus:bg-white focus:ring-2 focus:ring-[#38e7ff]";

export function ProfileEditForm({ profile }: { profile: Profile }) {
  const [state, formAction, isPending] = useActionState<
    ProfileEditState,
    FormData
  >(saveProfileAction, initialProfileEditState);
  const social = profile.social_links;

  return (
    <form action={formAction} className="comic-card bg-white p-5 sm:p-6">
      <p className="comic-chip bg-[#38e7ff]">Edit profile</p>
      <h1 className="mt-5 text-2xl font-black text-[#140625]">Your profile</h1>
      <p className="mt-3 text-sm font-medium leading-6 text-[#5a3b66]">
        Avatar uses an external image URL. No uploads here.
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
          <span className="text-sm font-black text-[#140625]">Username</span>
          <input
            name="username"
            type="text"
            required
            minLength={3}
            maxLength={30}
            pattern="[a-z0-9_]{3,30}"
            defaultValue={profile.username}
            placeholder="bountix_creator"
            className={inputClass}
          />
          <FieldError message={state.fieldErrors?.username} />
        </label>

        <label className="block">
          <span className="text-sm font-black text-[#140625]">
            Display name{" "}
            <span className="text-[#5a3b66]">optional</span>
          </span>
          <input
            name="display_name"
            type="text"
            maxLength={60}
            defaultValue={profile.display_name ?? ""}
            placeholder="Your public name"
            className={inputClass}
          />
          <FieldError message={state.fieldErrors?.display_name} />
        </label>

        <label className="block">
          <span className="text-sm font-black text-[#140625]">
            Bio <span className="text-[#5a3b66]">up to 500 chars</span>
          </span>
          <textarea
            name="bio"
            rows={4}
            maxLength={500}
            defaultValue={profile.bio ?? ""}
            placeholder="What do you build, ship, or solve?"
            className="mt-2 w-full rounded-lg border-2 border-[#140625] bg-[#fffaf4] px-3 py-3 font-medium text-[#140625] placeholder:text-[#5a3b66]/45 outline-none transition focus:bg-white focus:ring-2 focus:ring-[#38e7ff]"
          />
          <FieldError message={state.fieldErrors?.bio} />
        </label>

        <label className="block">
          <span className="text-sm font-black text-[#140625]">
            Avatar URL{" "}
            <span className="text-[#5a3b66]">external link, optional</span>
          </span>
          <input
            name="avatar_url"
            type="url"
            maxLength={500}
            defaultValue={profile.avatar_url ?? ""}
            placeholder="https://..."
            className={inputClass}
          />
          <FieldError message={state.fieldErrors?.avatar_url} />
        </label>

        <label className="block">
          <span className="text-sm font-black text-[#140625]">
            Skills{" "}
            <span className="text-[#5a3b66]">comma-separated, up to 12</span>
          </span>
          <input
            name="skills"
            type="text"
            defaultValue={profile.skills.join(", ")}
            placeholder="Research, growth, design ops"
            className={inputClass}
          />
        </label>

        <label className="block">
          <span className="text-sm font-black text-[#140625]">
            Wallet address (Stellar){" "}
            <span className="text-[#5a3b66]">optional</span>
          </span>
          <input
            name="wallet_address"
            type="text"
            defaultValue={profile.wallet_address ?? ""}
            placeholder="0x..."
            className={inputClass}
          />
          <FieldError message={state.fieldErrors?.wallet_address} />
        </label>

        <fieldset className="grid gap-3 rounded-lg border-2 border-dashed border-[#140625] bg-[#f2e6ff] p-4">
          <legend className="text-sm font-black uppercase text-[#140625]">
            Social links
          </legend>
          <label className="block">
            <span className="text-xs font-black text-[#140625]">X</span>
            <input
              name="social_x"
              type="text"
              defaultValue={social.x ?? ""}
              placeholder="@yourhandle or https://x.com/yourhandle"
              className={inputClass}
            />
            <FieldError message={state.fieldErrors?.x} />
          </label>
          <label className="block">
            <span className="text-xs font-black text-[#140625]">Telegram</span>
            <input
              name="social_telegram"
              type="text"
              defaultValue={social.telegram ?? ""}
              placeholder="@yourhandle"
              className={inputClass}
            />
            <FieldError message={state.fieldErrors?.telegram} />
          </label>
          <label className="block">
            <span className="text-xs font-black text-[#140625]">GitHub</span>
            <input
              name="social_github"
              type="text"
              defaultValue={social.github ?? ""}
              placeholder="yourhandle"
              className={inputClass}
            />
            <FieldError message={state.fieldErrors?.github} />
          </label>
          <label className="block">
            <span className="text-xs font-black text-[#140625]">Website</span>
            <input
              name="social_website"
              type="url"
              defaultValue={social.website ?? ""}
              placeholder="https://yoursite.com"
              className={inputClass}
            />
            <FieldError message={state.fieldErrors?.website} />
          </label>
        </fieldset>

        <label className="block">
          <span className="text-sm font-black text-[#140625]">
            Preferred language
          </span>
          <select
            name="preferred_language"
            defaultValue={profile.preferred_language}
            className="mt-2 h-12 w-full rounded-lg border-2 border-[#140625] bg-[#fffaf4] px-3 font-bold text-[#140625] outline-none focus:bg-white focus:ring-2 focus:ring-[#38e7ff]"
          >
            {PROFILE_LANGUAGES.map((lang) => (
              <option key={lang} value={lang}>
                {PROFILE_LANGUAGE_LABEL[lang]}
              </option>
            ))}
          </select>
          <FieldError message={state.fieldErrors?.preferred_language} />
        </label>
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
              Saving…
            </>
          ) : (
            <>
              <Save aria-hidden="true" className="h-4 w-4" />
              Save profile
            </>
          )}
        </button>
        <Link
          href="/dashboard/profile"
          className="inline-flex min-h-12 items-center justify-center gap-2 rounded-lg border-2 border-[#140625] bg-white px-5 py-3 text-sm font-black uppercase text-[#140625] shadow-[5px_5px_0_#140625] transition hover:-translate-y-0.5 hover:bg-[#38e7ff]"
        >
          Cancel
        </Link>
      </div>
    </form>
  );
}
