import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { ArrowLeft } from "lucide-react";
import { PostServiceForm } from "@/components/marketplace/post-service-form";
import { SiteHeader } from "@/components/site-header";
import { createTranslator } from "@/lib/i18n";
import { getRequestLocale } from "@/lib/i18n/server";
import { createClient } from "@/utils/supabase/server";
import {
  SERVICE_LIST_COLUMNS,
  type DbServiceOffer,
} from "@/lib/services";
import { isUuid } from "@/lib/tasks";

export const dynamic = "force-dynamic";

type RouteParams = { params: Promise<{ id: string }> };

export const metadata = {
  title: "Edit service offer",
  description: "Edit your Bountix creator service offer.",
};

async function loadEditableService(serviceId: string) {
  if (!isUuid(serviceId)) return null;

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return null;

  const { data: profile } = await supabase
    .from("profiles")
    .select("id, role")
    .eq("id", user.id)
    .maybeSingle();
  if (!profile) return null;

  const { data: service } = await supabase
    .from("services")
    .select(SERVICE_LIST_COLUMNS)
    .eq("id", serviceId)
    .maybeSingle();
  if (!service) return null;

  const isAdmin = profile.role === "admin";
  const isOwner = service.creator_id === user.id;
  if (!isAdmin && !isOwner) return null;

  return service as DbServiceOffer;
}

export default async function EditServicePage({ params }: RouteParams) {
  const locale = await getRequestLocale();
  const t = createTranslator(locale);
  const { id } = await params;
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    redirect("/login");
  }

  const service = await loadEditableService(id);
  if (!service) {
    notFound();
  }

  return (
    <main className="comic-page min-h-screen overflow-hidden text-[#140625]">
      <SiteHeader />
      <section className="container-page py-8 sm:py-12">
        <Link
          href="/dashboard/services"
          className="inline-flex items-center gap-2 rounded-lg border-2 border-[#140625] bg-white px-3 py-2 text-sm font-black text-[#140625] shadow-[3px_3px_0_#140625] transition hover:bg-[#38e7ff]"
        >
          <ArrowLeft aria-hidden="true" className="h-4 w-4" />
          {t("service.backToMyServices")}
        </Link>

        <section className="mx-auto mt-8 max-w-2xl">
          <PostServiceForm
            mode="edit"
            initialService={service}
            locale={locale}
          />
        </section>
      </section>
    </main>
  );
}
