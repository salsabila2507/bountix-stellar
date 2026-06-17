import Link from "next/link";
import { redirect } from "next/navigation";
import { ArrowLeft } from "lucide-react";
import { SiteHeader } from "@/components/site-header";
import { TaskForm } from "@/components/marketplace/task-form";
import { createTranslator } from "@/lib/i18n";
import { getRequestLocale } from "@/lib/i18n/server";
import { createClient } from "@/utils/supabase/server";

export const dynamic = "force-dynamic";

export const metadata = {
  title: "Post a Task",
  description:
    "Create a new Bountix task. Rewards paid in USDC on Stellar. Manual payment or Stellar escrow available.",
};

async function loadActor() {
  try {
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) return { user: null, profile: null as null };

    const { data: profile } = await supabase
      .from("profiles")
      .select("id, role, username")
      .eq("id", user.id)
      .maybeSingle();

    return {
      user,
      profile: profile as
        | {
            id: string;
            role: string;
            username: string;
          }
        | null,
    };
  } catch {
    return { user: null, profile: null as null };
  }
}

export default async function PostTaskPage() {
  const locale = await getRequestLocale();
  const t = createTranslator(locale);
  const { user, profile } = await loadActor();

  if (!user) {
    redirect("/login");
  }

  if (!profile) {
    // Trigger should have made one; fallback message:
    return (
      <main className="comic-page min-h-screen overflow-hidden text-[#140625]">
        <SiteHeader />
        <section className="container-page py-10">
          <p className="text-base font-semibold text-[#5a3b66]">
            {t("postTask.profileMissing")}
          </p>
        </section>
      </main>
    );
  }

  const isAdmin = profile.role === "admin";

  return (
    <main className="comic-page min-h-screen overflow-hidden text-[#140625]">
      <SiteHeader />
      <section className="container-page py-8 sm:py-12">
        <Link
          href="/dashboard/tasks"
          className="inline-flex items-center gap-2 rounded-lg border-2 border-[#140625] bg-white px-3 py-2 text-sm font-black text-[#140625] shadow-[3px_3px_0_#140625] transition hover:bg-[#38e7ff]"
        >
          <ArrowLeft aria-hidden="true" className="h-4 w-4" />
          {t("common.backToMyTasks")}
        </Link>

        <section className="mx-auto mt-8 max-w-2xl">
          <TaskForm mode="create" isAdmin={isAdmin} locale={locale} />
        </section>
      </section>
    </main>
  );
}
