import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { PrivyLoginSection } from "@/components/auth/privy-login-section";

type LoginPageProps = {
  searchParams: Promise<{
    auth_error?: string | string[];
  }>;
};

export const dynamic = "force-dynamic";

export const metadata = {
  title: "Log In",
  description: "Log in to your Bountix account.",
};

export default async function LoginPage({ searchParams }: LoginPageProps) {
  const params = await searchParams;
  const authError = Array.isArray(params.auth_error)
    ? params.auth_error[0]
    : params.auth_error;

  return (
    <main className="comic-page min-h-screen overflow-hidden text-[#140625]">
      <div className="container-page py-8 sm:py-10">
        <Link
          href="/"
          className="inline-flex items-center gap-2 rounded-lg border-2 border-[#140625] bg-white px-3 py-2 text-sm font-black text-[#140625] shadow-[3px_3px_0_#140625] transition hover:bg-[#38e7ff]"
        >
          <ArrowLeft aria-hidden="true" className="h-4 w-4" />
          Back to Bountix
        </Link>

        <section className="mx-auto mt-10 max-w-md">
          <PrivyLoginSection authError={Boolean(authError)} />
        </section>
      </div>
    </main>
  );
}
