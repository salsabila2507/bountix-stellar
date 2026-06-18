"use client";

type Props = {
  error: Error & { digest?: string };
  reset: () => void;
};

export default function ErrorPage({ error, reset }: Props) {
  console.error("Dashboard profile error:", error.message, error.stack);
  return (
    <div className="flex min-h-screen items-center justify-center p-4">
      <div className="max-w-md text-center">
        <h1 className="mb-2 text-2xl font-bold">Something went wrong</h1>
        <p className="mb-4 text-sm opacity-60">An unexpected error occurred on this page.</p>
        <p className="mb-6 text-xs opacity-40 font-mono">ref: {error.digest}</p>
        <button
          onClick={reset}
          className="rounded-lg bg-[#140625] px-6 py-2 text-white hover:opacity-80"
        >
          Try again
        </button>
      </div>
    </div>
  );
}
