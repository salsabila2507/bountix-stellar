"use client";

import { useActionState, useState } from "react";
import {
  Check,
  CheckCircle2,
  ExternalLink,
  LoaderCircle,
  Send,
  TriangleAlert,
} from "lucide-react";
import { joinWaitlist } from "@/app/waitlist/actions";
import { initialWaitlistState, roles } from "@/lib/waitlist";

const telegramGroupUrl = "https://t.me/+V78fuYlQNvcxYTNl";
const xUrl = "https://x.com/bountixofc";
const announcementUrl =
  "https://x.com/Bountixofc/status/2060249739686551790?s=20";

function FieldError({ message }: { message?: string }) {
  if (!message) {
    return null;
  }

  return <p className="mt-2 text-sm font-bold text-[#c42463]">{message}</p>;
}

export function WaitlistForm() {
  const [state, formAction, isPending] = useActionState(
    joinWaitlist,
    initialWaitlistState,
  );
  const [joinedTelegram, setJoinedTelegram] = useState(false);
  const [followedX, setFollowedX] = useState(false);
  const [repostedAnnouncement, setRepostedAnnouncement] = useState(false);
  const [commentedAnnouncement, setCommentedAnnouncement] = useState(false);
  const canSubmit =
    joinedTelegram &&
    followedX &&
    repostedAnnouncement &&
    commentedAnnouncement &&
    !isPending;

  if (state.status === "success") {
    return (
      <div className="comic-card bg-white p-6">
        <div className="flex h-12 w-12 items-center justify-center rounded-lg border-2 border-[#140625] bg-[#23b26d] text-white shadow-[3px_3px_0_#140625]">
          <CheckCircle2 aria-hidden="true" className="h-6 w-6" />
        </div>
        <h2 className="mt-6 text-2xl font-black text-[#140625]">
          You are registered for Bountix updates.
        </h2>
        <p className="mt-3 text-sm font-medium leading-6 text-[#5a3b66]">
          {state.message}
        </p>
        <div className="mt-6 grid gap-3 sm:grid-cols-2">
          <a
            href={telegramGroupUrl}
            target="_blank"
            rel="noreferrer"
            className="inline-flex min-h-12 items-center justify-center gap-2 rounded-lg border-2 border-[#140625] bg-[#38e7ff] px-5 py-3 text-sm font-black uppercase text-[#140625] shadow-[4px_4px_0_#140625] transition hover:bg-[#ffdd3d]"
          >
            <Send aria-hidden="true" className="h-4 w-4" />
            Telegram
          </a>
          <a
            href={xUrl}
            target="_blank"
            rel="noreferrer"
            className="inline-flex min-h-12 items-center justify-center gap-2 rounded-lg border-2 border-[#140625] bg-[#ff4fb8] px-5 py-3 text-sm font-black uppercase text-white shadow-[4px_4px_0_#140625] transition hover:bg-[#7c3cff]"
          >
            <ExternalLink aria-hidden="true" className="h-4 w-4" />
            Follow X
          </a>
        </div>
      </div>
    );
  }

  return (
    <form action={formAction} className="comic-card bg-white p-5 sm:p-6">
      <div>
        <p className="comic-chip bg-[#38e7ff]">Early access</p>
        <h1 className="mt-5 text-2xl font-black text-[#140625]">
          Register for Bountix updates
        </h1>
        <p className="mt-3 text-sm font-medium leading-6 text-[#5a3b66]">
          Tell us how you plan to use Bountix. We are onboarding the first
          creators and operators in focused waves.
        </p>
      </div>

      {state.status === "error" && state.message ? (
        <div className="mt-6 flex gap-3 rounded-lg border-2 border-[#140625] bg-[#ffe1ed] p-3 text-sm font-bold text-[#8a1742]">
          <TriangleAlert
            aria-hidden="true"
            className="mt-0.5 h-4 w-4 shrink-0"
          />
          <p>{state.message}</p>
        </div>
      ) : null}

      <div className="mt-6 grid gap-5">
        <label className="block">
          <span className="text-sm font-black text-[#140625]">Name</span>
          <input
            name="name"
            type="text"
            autoComplete="name"
            required
            minLength={2}
            placeholder="Your name or operator handle"
            className="mt-2 h-12 w-full rounded-lg border-2 border-[#140625] bg-[#fffaf4] px-3 font-medium text-[#140625] placeholder:text-[#5a3b66]/45 outline-none transition focus:bg-white focus:ring-2 focus:ring-[#38e7ff]"
          />
          <FieldError message={state.errors?.name} />
        </label>

        <label className="block">
          <span className="text-sm font-black text-[#140625]">Email</span>
          <input
            name="email"
            type="email"
            autoComplete="email"
            required
            placeholder="you@example.com"
            className="mt-2 h-12 w-full rounded-lg border-2 border-[#140625] bg-[#fffaf4] px-3 font-medium text-[#140625] placeholder:text-[#5a3b66]/45 outline-none transition focus:bg-white focus:ring-2 focus:ring-[#38e7ff]"
          />
          <FieldError message={state.errors?.email} />
        </label>

        <label className="block">
          <span className="text-sm font-black text-[#140625]">
            Telegram username
          </span>
          <input
            name="telegram"
            type="text"
            autoComplete="off"
            required
            placeholder="@yourusername"
            className="mt-2 h-12 w-full rounded-lg border-2 border-[#140625] bg-[#fffaf4] px-3 font-medium text-[#140625] placeholder:text-[#5a3b66]/45 outline-none transition focus:bg-white focus:ring-2 focus:ring-[#38e7ff]"
          />
          <FieldError message={state.errors?.telegram} />
        </label>

        <fieldset>
          <legend className="text-sm font-black text-[#140625]">Role</legend>
          <div className="mt-2 grid gap-2 sm:grid-cols-3">
            {roles.map((role) => (
              <label
                key={role}
                className="flex min-h-12 cursor-pointer items-center gap-3 rounded-lg border-2 border-[#140625] bg-[#fffaf4] px-3 text-sm font-black text-[#140625] transition has-[:checked]:bg-[#ffdd3d]"
              >
                <input
                  name="role"
                  type="radio"
                  value={role}
                  required
                  className="h-4 w-4 border-[#140625] bg-transparent text-[#7c3cff] focus:ring-[#38e7ff]"
                />
                {role}
              </label>
            ))}
          </div>
          <FieldError message={state.errors?.role} />
        </fieldset>

        <label className="block">
          <span className="text-sm font-black text-[#140625]">
            Specialty <span className="text-[#5a3b66]">optional</span>
          </span>
          <input
            name="specialty"
            type="text"
            maxLength={120}
            placeholder="Research, design, growth, data, ops..."
            className="mt-2 h-12 w-full rounded-lg border-2 border-[#140625] bg-[#fffaf4] px-3 font-medium text-[#140625] placeholder:text-[#5a3b66]/45 outline-none transition focus:bg-white focus:ring-2 focus:ring-[#38e7ff]"
          />
          <FieldError message={state.errors?.specialty} />
        </label>
      </div>

      <div className="mt-6 grid gap-3 rounded-lg border-2 border-dashed border-[#140625] bg-[#f2e6ff] p-4">
        <p className="text-sm font-black uppercase text-[#140625]">
          Social confirmation required
        </p>
        <label className="flex cursor-pointer gap-3 text-sm font-bold leading-6 text-[#140625]">
          <input
            type="checkbox"
            checked={joinedTelegram}
            onChange={(event) => setJoinedTelegram(event.target.checked)}
            required
            className="mt-1 h-4 w-4 shrink-0 rounded border-[#140625] text-[#7c3cff] focus:ring-[#38e7ff]"
          />
          <span>
            I have joined the Bountix Telegram group{" "}
            <a
              href={telegramGroupUrl}
              target="_blank"
              rel="noreferrer"
              className="inline-flex items-center gap-1 text-[#7c3cff] underline decoration-2 underline-offset-2"
            >
              open
              <ExternalLink aria-hidden="true" className="h-3.5 w-3.5" />
            </a>
          </span>
        </label>
        <label className="flex cursor-pointer gap-3 text-sm font-bold leading-6 text-[#140625]">
          <input
            type="checkbox"
            checked={followedX}
            onChange={(event) => setFollowedX(event.target.checked)}
            required
            className="mt-1 h-4 w-4 shrink-0 rounded border-[#140625] text-[#7c3cff] focus:ring-[#38e7ff]"
          />
          <span>
            I have followed @bountixofc on X{" "}
            <a
              href={xUrl}
              target="_blank"
              rel="noreferrer"
              className="inline-flex items-center gap-1 text-[#7c3cff] underline decoration-2 underline-offset-2"
            >
              open
              <ExternalLink aria-hidden="true" className="h-3.5 w-3.5" />
            </a>
          </span>
        </label>
        <label className="flex cursor-pointer gap-3 text-sm font-bold leading-6 text-[#140625]">
          <input
            type="checkbox"
            checked={repostedAnnouncement}
            onChange={(event) => setRepostedAnnouncement(event.target.checked)}
            required
            className="mt-1 h-4 w-4 shrink-0 rounded border-[#140625] text-[#7c3cff] focus:ring-[#38e7ff]"
          />
          <span>
            I have reposted the official Bountix announcement{" "}
            <a
              href={announcementUrl}
              target="_blank"
              rel="noreferrer"
              className="inline-flex items-center gap-1 text-[#7c3cff] underline decoration-2 underline-offset-2"
            >
              open
              <ExternalLink aria-hidden="true" className="h-3.5 w-3.5" />
            </a>
          </span>
        </label>
        <label className="flex cursor-pointer gap-3 text-sm font-bold leading-6 text-[#140625]">
          <input
            type="checkbox"
            checked={commentedAnnouncement}
            onChange={(event) => setCommentedAnnouncement(event.target.checked)}
            required
            className="mt-1 h-4 w-4 shrink-0 rounded border-[#140625] text-[#7c3cff] focus:ring-[#38e7ff]"
          />
          <span>
            I have commented on the official Bountix announcement{" "}
            <a
              href={announcementUrl}
              target="_blank"
              rel="noreferrer"
              className="inline-flex items-center gap-1 text-[#7c3cff] underline decoration-2 underline-offset-2"
            >
              open
              <ExternalLink aria-hidden="true" className="h-3.5 w-3.5" />
            </a>
          </span>
        </label>
        {state.errors?.confirmations ? (
          <FieldError message={state.errors.confirmations} />
        ) : null}
      </div>

      {/* Hidden inputs to pass confirmation state to server */}
      <input type="hidden" name="joined_telegram" value={String(joinedTelegram)} />
      <input type="hidden" name="followed_x" value={String(followedX)} />
      <input
        type="hidden"
        name="reposted_announcement"
        value={String(repostedAnnouncement)}
      />
      <input
        type="hidden"
        name="commented_announcement"
        value={String(commentedAnnouncement)}
      />

      <button
        type="submit"
        disabled={!canSubmit}
        className="mt-6 inline-flex min-h-12 w-full items-center justify-center gap-2 rounded-lg border-2 border-[#140625] bg-[#ff4fb8] px-5 py-3 text-sm font-black uppercase text-white shadow-[5px_5px_0_#140625] transition hover:-translate-y-0.5 hover:bg-[#7c3cff] active:translate-y-0 focus:outline-none focus:ring-2 focus:ring-[#38e7ff] focus:ring-offset-2 focus:ring-offset-white disabled:cursor-not-allowed disabled:bg-[#c9c0d3] disabled:text-[#5a3b66] disabled:shadow-[3px_3px_0_#140625] disabled:hover:translate-y-0"
      >
        {isPending ? (
          <>
            <LoaderCircle aria-hidden="true" className="h-4 w-4 animate-spin" />
            Joining...
          </>
        ) : (
          <>
            <Check aria-hidden="true" className="h-4 w-4" />
            Join Waitlist
          </>
        )}
      </button>

      <p className="mt-4 text-center text-sm font-medium leading-6 text-[#5a3b66]">
        All four social confirmations must be checked before the form can
        submit.
      </p>
    </form>
  );
}
