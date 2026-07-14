import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { ResetPasswordForm } from "@/components/auth/reset-password-form";

export const dynamic = "force-dynamic";

export const metadata = {
  title: "Reset Password",
  description: "Create a new password for your Bountix account.",
};

export default async function ResetPasswordPage() {
  return (
    <main className="comic-page min-h-screen overflow-hidden text-[#140625]">
      <div className="container-page py-8 sm:py-10">
        <Link
          href="/login"
          className="inline-flex items-center gap-2 rounded-lg border-2 border-[#140625] bg-white px-3 py-2 text-sm font-black text-[#140625] shadow-[3px_3px_0_#140625] transition hover:bg-[#38e7ff]"
        >
          <ArrowLeft aria-hidden="true" className="h-4 w-4" />
          Back to Login
        </Link>

        <section className="mx-auto mt-10 max-w-md">
          <ResetPasswordForm />
        </section>
      </div>
    </main>
  );
}
