import Link from "next/link";
import { redirect } from "next/navigation";
import {
  ArrowLeft,
  Clock3,
  Edit3,
  Eye,
  Pause,
  Plus,
  RotateCcw,
  Archive,
} from "lucide-react";
import { setServiceStatusAction } from "@/app/services/actions";
import { SiteHeader } from "@/components/site-header";
import { createTranslator, formatDate } from "@/lib/i18n";
import { getRequestLocale } from "@/lib/i18n/server";
import { createClient } from "@/utils/supabase/server";
import {
  SERVICE_LIST_COLUMNS,
  type DbServiceOffer,
  type ServiceStatus,
} from "@/lib/services";

export const dynamic = "force-dynamic";

export const metadata = {
  title: "My Services",
  description: "Manage your Bountix creator service offers.",
};

async function loadMyServices(): Promise<{
  userId: string | null;
  username: string | null;
  services: DbServiceOffer[];
}> {
  try {
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) return { userId: null, username: null, services: [] };

    const { data: profile } = await supabase
      .from("profiles")
      .select("username")
      .eq("id", user.id)
      .maybeSingle();

    const { data, error } = await supabase
      .from("services")
      .select(SERVICE_LIST_COLUMNS)
      .eq("creator_id", user.id)
      .order("created_at", { ascending: false })
      .limit(50);

    if (error || !data) {
      return {
        userId: user.id,
        username: profile?.username ?? null,
        services: [],
      };
    }

    return {
      userId: user.id,
      username: profile?.username ?? null,
      services: data as DbServiceOffer[],
    };
  } catch {
    return { userId: null, username: null, services: [] };
  }
}

function formatServicePrice(service: DbServiceOffer, negotiableLabel: string) {
  if (service.price_amount === null) return negotiableLabel;
  const amount = new Intl.NumberFormat("en-US", {
    maximumFractionDigits: 2,
  }).format(service.price_amount);
  return `${amount} ${service.currency}`;
}

export default async function DashboardServicesPage() {
  const locale = await getRequestLocale();
  const t = createTranslator(locale);
  const { userId, username, services } = await loadMyServices();
  if (!userId) {
    redirect("/login");
  }

  return (
    <main className="comic-page min-h-screen overflow-hidden text-[#140625]">
      <SiteHeader />
      <section className="container-page py-8 sm:py-12">
        <div className="flex items-center justify-between gap-4">
          <Link
            href="/dashboard"
            className="inline-flex items-center gap-2 rounded-lg border-2 border-[#140625] bg-white px-3 py-2 text-sm font-black text-[#140625] shadow-[3px_3px_0_#140625] transition hover:bg-[#38e7ff]"
          >
            <ArrowLeft aria-hidden="true" className="h-4 w-4" />
            {t("common.backToDashboard")}
          </Link>
          <Link
            href="/post-service"
            className="inline-flex min-h-11 items-center justify-center gap-2 rounded-lg border-2 border-[#140625] bg-[#ff4fb8] px-3 py-2 text-xs font-black uppercase text-white shadow-[3px_3px_0_#140625] transition hover:-translate-y-0.5 hover:bg-[#7c3cff]"
          >
            <Plus aria-hidden="true" className="h-4 w-4" />
            {t("common.postService")}
          </Link>
        </div>

        <div className="mt-6">
          <p className="comic-chip bg-[#ffdd3d]">
            {t("dashboard.services.chip")}
          </p>
          <h1 className="mt-3 text-3xl font-black uppercase leading-none sm:text-5xl">
            {t("dashboard.services.title")}
          </h1>
          <p className="mt-3 text-sm font-bold leading-6 text-[#5a3b66]">
            {t("dashboard.services.body")}
          </p>
        </div>

        {services.length > 0 ? (
          <div className="mt-8 grid gap-4 lg:grid-cols-2">
            {services.map((service) => (
              <DashboardServiceCard
                key={service.id}
                service={service}
                username={username}
                labels={{
                  edit: t("service.editOffer"),
                  active: t("service.status.active"),
                  paused: t("service.status.paused"),
                  archived: t("service.status.archived"),
                  pause: t("service.pause"),
                  unpause: t("service.unpause"),
                  archive: t("service.archive"),
                  publicProfile: t("service.publicProfile"),
                  service: t("service.offer"),
                  negotiable: t("service.price.negotiable"),
                  deliveryTime: t("service.deliveryTime"),
                  noDelivery: t("service.noDeliveryTime"),
                  manual: t("service.payment.manual"),
                  escrow: t("service.payment.escrow_stellar"),
                  updated: t("service.updatedOn", {
                    date: formatDate(service.updated_at, locale),
                  }),
                }}
              />
            ))}
          </div>
        ) : (
          <div className="comic-card mt-8 bg-white p-6 text-center sm:p-8">
            <h2 className="text-xl font-black text-[#140625]">
              {t("dashboard.services.emptyTitle")}
            </h2>
            <p className="mt-3 text-sm font-bold leading-6 text-[#5a3b66]">
              {t("dashboard.services.emptyBody")}
            </p>
            <Link
              href="/post-service"
              className="mt-6 inline-flex min-h-11 items-center justify-center gap-2 rounded-lg border-2 border-[#140625] bg-[#ff4fb8] px-4 text-sm font-black uppercase text-white shadow-[4px_4px_0_#140625] transition hover:-translate-y-0.5 hover:bg-[#7c3cff]"
            >
              <Plus aria-hidden="true" className="h-4 w-4" />
              {t("service.beFirst")}
            </Link>
          </div>
        )}
      </section>
    </main>
  );
}

function StatusButton({
  serviceId,
  status,
  label,
  icon,
}: {
  serviceId: string;
  status: ServiceStatus;
  label: string;
  icon: React.ReactNode;
}) {
  const action = setServiceStatusAction.bind(null, serviceId, status);
  return (
    <form action={action}>
      <button
        type="submit"
        className="inline-flex min-h-10 items-center justify-center gap-2 rounded-lg border-2 border-[#140625] bg-white px-3 py-2 text-xs font-black uppercase text-[#140625] shadow-[3px_3px_0_#140625] transition hover:-translate-y-0.5 hover:bg-[#38e7ff]"
      >
        {icon}
        {label}
      </button>
    </form>
  );
}

function DashboardServiceCard({
  service,
  username,
  labels,
}: {
  service: DbServiceOffer;
  username: string | null;
  labels: {
    edit: string;
    active: string;
    paused: string;
    archived: string;
    pause: string;
    unpause: string;
    archive: string;
    publicProfile: string;
    service: string;
    negotiable: string;
    deliveryTime: string;
    noDelivery: string;
    manual: string;
    escrow: string;
    updated: string;
  };
}) {
  const statusLabels: Record<DbServiceOffer["status"], string> = {
    active: labels.active,
    paused: labels.paused,
    archived: labels.archived,
  };
  const statusLabel = statusLabels[service.status];
  const price = formatServicePrice(service, labels.negotiable);

  return (
    <article className="comic-card bg-white p-5">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <div className="flex flex-wrap gap-2">
            <span className="rounded-lg border-2 border-[#140625] bg-[#ffdd3d] px-3 py-1.5 text-xs font-black uppercase text-[#140625] shadow-[3px_3px_0_#140625]">
              {statusLabel}
            </span>
            <span className="rounded-lg border-2 border-[#140625] bg-[#38e7ff] px-3 py-1.5 text-xs font-black uppercase text-[#140625] shadow-[3px_3px_0_#140625]">
              {service.payment_method === "escrow_stellar"
                ? labels.escrow
                : labels.manual}
            </span>
          </div>
          <p className="mt-4 text-xs font-black uppercase text-[#7c3cff]">
            {service.category || labels.service}
          </p>
          <h2 className="mt-2 text-2xl font-black leading-tight text-[#140625]">
            {service.title}
          </h2>
        </div>
        <p className="inline-flex shrink-0 rounded-lg border-2 border-[#140625] bg-[#fffaf4] px-3 py-2 text-sm font-black text-[#140625] shadow-[3px_3px_0_#140625]">
          {service.price_type === "negotiable" && service.price_amount
            ? `${price} · ${labels.negotiable}`
            : price}
        </p>
      </div>

      <p className="mt-4 line-clamp-3 text-sm font-semibold leading-6 text-[#5a3b66]">
        {service.description}
      </p>

      <div className="mt-4 flex flex-wrap gap-2">
        {(service.tags ?? []).map((tag) => (
          <span
            key={tag}
            className="rounded-lg border-2 border-[#140625] bg-[#f2e6ff] px-2.5 py-1 text-xs font-black text-[#140625]"
          >
            {tag}
          </span>
        ))}
      </div>

      <div className="mt-5 flex flex-col gap-2 border-t-2 border-dashed border-[#140625]/30 pt-4 text-sm font-bold text-[#5a3b66] sm:flex-row sm:items-center sm:justify-between">
        <span className="inline-flex items-center gap-2">
          <Clock3 aria-hidden="true" className="h-4 w-4 text-[#7c3cff]" />
          {service.delivery_time
            ? `${labels.deliveryTime}: ${service.delivery_time}`
            : labels.noDelivery}
        </span>
        <span>{labels.updated}</span>
      </div>

      <div className="mt-5 flex flex-wrap gap-3">
        <Link
          href={`/dashboard/services/${service.id}/edit`}
          className="inline-flex min-h-10 items-center justify-center gap-2 rounded-lg border-2 border-[#140625] bg-[#ff4fb8] px-3 py-2 text-xs font-black uppercase text-white shadow-[3px_3px_0_#140625] transition hover:-translate-y-0.5 hover:bg-[#7c3cff]"
        >
          <Edit3 aria-hidden="true" className="h-4 w-4" />
          {labels.edit}
        </Link>
        {username ? (
          <Link
            href={`/profile/${username}`}
            className="inline-flex min-h-10 items-center justify-center gap-2 rounded-lg border-2 border-[#140625] bg-[#ffdd3d] px-3 py-2 text-xs font-black uppercase text-[#140625] shadow-[3px_3px_0_#140625] transition hover:-translate-y-0.5 hover:bg-[#38e7ff]"
          >
            <Eye aria-hidden="true" className="h-4 w-4" />
            {labels.publicProfile}
          </Link>
        ) : null}
        {service.status === "active" ? (
          <StatusButton
            serviceId={service.id}
            status="paused"
            label={labels.pause}
            icon={<Pause aria-hidden="true" className="h-4 w-4" />}
          />
        ) : null}
        {service.status === "paused" ? (
          <StatusButton
            serviceId={service.id}
            status="active"
            label={labels.unpause}
            icon={<RotateCcw aria-hidden="true" className="h-4 w-4" />}
          />
        ) : null}
        {service.status !== "archived" ? (
          <StatusButton
            serviceId={service.id}
            status="archived"
            label={labels.archive}
            icon={<Archive aria-hidden="true" className="h-4 w-4" />}
          />
        ) : null}
      </div>
    </article>
  );
}
