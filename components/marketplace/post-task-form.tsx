import { LockKeyhole } from "lucide-react";

export function PostTaskForm() {
  return (
    <form className="rounded-lg border-2 border-[#140625] bg-white p-5 text-[#140625] shadow-[8px_8px_0_#140625] sm:p-6">
      <div>
        <p className="comic-chip bg-[#38e7ff]">
          Client task
        </p>
        <h2 className="mt-4 text-2xl font-black text-[#140625]">Post a task</h2>
        <p className="mt-3 text-sm font-semibold leading-6 text-[#5a3b66]">
          Draft a clear task brief with a reward, timeline, and proof checklist.
        </p>
      </div>

      <div className="mt-6 grid gap-5">
        <label className="block">
          <span className="text-sm font-black text-[#140625]">Task title</span>
          <input
            type="text"
            placeholder="Map creator communities for launch"
            className="mt-2 h-12 w-full rounded-lg border-2 border-[#140625] bg-[#fffaf4] px-3 font-semibold text-[#140625] placeholder:text-[#5a3b66]/50 outline-none transition focus:bg-white focus:ring-2 focus:ring-[#38e7ff]"
          />
        </label>

        <label className="block">
          <span className="text-sm font-black text-[#140625]">Brief</span>
          <textarea
            rows={5}
            placeholder="Describe the work, acceptance criteria, timeline, and deliverables..."
            className="mt-2 w-full rounded-lg border-2 border-[#140625] bg-[#fffaf4] px-3 py-3 font-semibold text-[#140625] placeholder:text-[#5a3b66]/50 outline-none transition focus:bg-white focus:ring-2 focus:ring-[#38e7ff]"
          />
        </label>

        <div className="grid gap-5 sm:grid-cols-2">
          <label className="block">
            <span className="text-sm font-black text-[#140625]">Budget</span>
            <input
              type="text"
              placeholder="$500"
              className="mt-2 h-12 w-full rounded-lg border-2 border-[#140625] bg-[#fffaf4] px-3 font-semibold text-[#140625] placeholder:text-[#5a3b66]/50 outline-none transition focus:bg-white focus:ring-2 focus:ring-[#38e7ff]"
            />
          </label>

          <label className="block">
            <span className="text-sm font-black text-[#140625]">Payment type</span>
            <select className="mt-2 h-12 w-full rounded-lg border-2 border-[#140625] bg-[#fffaf4] px-3 font-semibold text-[#140625] outline-none transition focus:bg-white focus:ring-2 focus:ring-[#38e7ff]">
              <option>Regular Payment</option>
              <option>Escrow Protected</option>
            </select>
          </label>
        </div>

        <label className="flex items-start gap-3 rounded-lg border-2 border-[#140625] bg-[#f1d8ff] p-4 shadow-[4px_4px_0_#140625]">
          <input
            type="checkbox"
            className="mt-1 h-4 w-4 border-[#140625] text-[#7c3cff] focus:ring-[#38e7ff]"
          />
          <span>
            <span className="block text-sm font-black text-[#140625]">
              Allow price negotiation
            </span>
            <span className="mt-1 block text-sm font-semibold leading-6 text-[#5a3b66]">
              Applicants can propose a different scope or price before work starts.
            </span>
          </span>
        </label>

        <div className="rounded-lg border-2 border-[#140625] bg-[#38e7ff] p-4 shadow-[4px_4px_0_#140625]">
          <div className="flex items-start gap-3">
            <LockKeyhole
              aria-hidden="true"
              className="mt-0.5 h-4 w-4 shrink-0 text-[#7c3cff]"
            />
            <p className="text-sm font-semibold leading-6 text-[#3c214b]">
              Rewards can be paid in USDC on Stellar through manual payment or Stellar escrow.
            </p>
          </div>
        </div>
      </div>

      <button
        type="button"
        disabled
        aria-disabled="true"
        title="Use the live Post a task flow"
        className="mt-6 inline-flex min-h-12 w-full cursor-not-allowed items-center justify-center rounded-lg border-2 border-[#140625] bg-[#ff4fb8] px-5 py-3 text-sm font-black uppercase text-white shadow-[5px_5px_0_#140625] opacity-90"
      >
        Use live post task
      </button>
    </form>
  );
}
