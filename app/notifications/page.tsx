import Link from "next/link";
import { redirect } from "next/navigation";
import {
  ArrowLeft,
  Bell,
  Check,
  CheckCheck,
  ExternalLink,
  Inbox,
} from "lucide-react";
import {
  markAllNotificationsReadAction,
  markNotificationReadAction,
} from "@/app/notifications/actions";
import { SiteHeader } from "@/components/site-header";
import {
  createTranslator,
  formatDate,
  type TranslationKey,
} from "@/lib/i18n";
import { getRequestLocale } from "@/lib/i18n/server";
import {
  loadNotifications,
  type NotificationItem,
} from "@/lib/notifications";

export const dynamic = "force-dynamic";

export const metadata = {
  title: "Notifications",
  description: "Latest Bountix in-app notifications.",
};

export default async function NotificationsPage() {
  const locale = await getRequestLocale();
  const t = createTranslator(locale);
  const data = await loadNotifications();
  if (!data) redirect("/login");

  return (
    <main className="comic-page min-h-screen overflow-hidden text-[#140625]">
      <SiteHeader />
      <section className="container-page py-8 sm:py-12">
        <Link
          href="/dashboard"
          className="inline-flex items-center gap-2 rounded-lg border-2 border-[#140625] bg-white px-3 py-2 text-sm font-black text-[#140625] shadow-[3px_3px_0_#140625] transition hover:bg-[#38e7ff]"
        >
          <ArrowLeft aria-hidden="true" className="h-4 w-4" />
          {t("common.backToDashboard")}
        </Link>

        <div className="mt-6 flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <p className="comic-chip bg-[#38e7ff]">
              <Bell aria-hidden="true" className="h-3.5 w-3.5" />
              {t("common.notifications")}
            </p>
            <h1 className="mt-3 text-3xl font-black uppercase leading-none sm:text-5xl">
              {t("notifications.title")}
            </h1>
            <p className="mt-3 text-sm font-bold leading-6 text-[#5a3b66]">
              {t("notifications.body")}
            </p>
          </div>

          {data.unreadCount > 0 ? (
            <form action={markAllNotificationsReadAction}>
              <button
                type="submit"
                className="inline-flex min-h-11 items-center justify-center gap-2 rounded-lg border-2 border-[#140625] bg-[#ffdd3d] px-4 py-2 text-xs font-black uppercase text-[#140625] shadow-[3px_3px_0_#140625] transition hover:-translate-y-0.5 hover:bg-[#38e7ff]"
              >
                <CheckCheck aria-hidden="true" className="h-4 w-4" />
                {t("common.markAllRead")}
              </button>
            </form>
          ) : null}
        </div>

        <div className="mt-5 inline-flex rounded-lg border-2 border-[#140625] bg-white px-3 py-2 text-xs font-black uppercase text-[#140625] shadow-[3px_3px_0_#140625]">
          {t("notifications.unreadCount", { count: data.unreadCount })}
        </div>

        {data.notifications.length === 0 ? (
          <div className="comic-card mt-8 bg-white p-6 text-center sm:p-8">
            <span className="mx-auto flex h-14 w-14 items-center justify-center rounded-lg border-2 border-[#140625] bg-[#f0d7ff] shadow-[4px_4px_0_#140625]">
              <Inbox aria-hidden="true" className="h-7 w-7" />
            </span>
            <h2 className="mt-5 text-xl font-black text-[#140625]">
              {t("notifications.emptyTitle")}
            </h2>
            <p className="mx-auto mt-3 max-w-md text-sm font-bold leading-6 text-[#5a3b66]">
              {t("notifications.emptyBody")}
            </p>
          </div>
        ) : (
          <div className="mt-8 grid gap-4">
            {data.notifications.map((notification) => (
              <NotificationCard
                key={`${notification.is_global ? "global" : "user"}-${notification.id}`}
                notification={notification}
                locale={locale}
                t={t}
              />
            ))}
          </div>
        )}
      </section>
    </main>
  );
}

function NotificationCard({
  notification,
  locale,
  t,
}: {
  notification: NotificationItem;
  locale: "en" | "id" | "zh";
  t: ReturnType<typeof createTranslator>;
}) {
  const isUnread = !notification.effective_read_at;

  return (
    <article
      className={`comic-card bg-white p-5 sm:p-6 ${
        isUnread ? "shadow-[8px_8px_0_#7c3cff]" : ""
      }`}
    >
      <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div className="min-w-0">
          <div className="flex flex-wrap items-center gap-2">
            <span
              className={`inline-flex rounded-md border-2 border-[#140625] px-2 py-1 text-[0.65rem] font-black uppercase shadow-[2px_2px_0_#140625] ${
                notification.is_global
                  ? "bg-[#38e7ff] text-[#140625]"
                  : "bg-[#f0d7ff] text-[#140625]"
              }`}
            >
              {notification.is_global
                ? t("notifications.global")
                : t("notifications.personal")}
            </span>
            <span
              className={`inline-flex rounded-md border-2 border-[#140625] px-2 py-1 text-[0.65rem] font-black uppercase shadow-[2px_2px_0_#140625] ${
                isUnread ? "bg-[#ffdd3d]" : "bg-white text-[#5a3b66]"
              }`}
            >
              {isUnread ? t("notifications.unread") : t("notifications.read")}
            </span>
          </div>

          <h2 className="mt-3 text-xl font-black text-[#140625]">
            {notification.title}
          </h2>
          <p className="mt-2 whitespace-pre-line text-sm font-bold leading-6 text-[#3c214b]">
            {notification.body}
          </p>
          <p className="mt-3 text-xs font-black uppercase text-[#5a3b66]">
            {formatDate(notification.created_at, locale)}
          </p>
        </div>

        <div className="flex shrink-0 flex-wrap gap-2 sm:justify-end">
          {notification.link_url ? (
            <Link
              href={notification.link_url}
              className="inline-flex min-h-10 items-center justify-center gap-2 rounded-lg border-2 border-[#140625] bg-white px-3 py-2 text-xs font-black uppercase text-[#140625] shadow-[3px_3px_0_#140625] transition hover:-translate-y-0.5 hover:bg-[#38e7ff]"
            >
              <ExternalLink aria-hidden="true" className="h-4 w-4" />
              {t("notifications.openLink")}
            </Link>
          ) : null}

          {isUnread ? (
            <form action={markNotificationReadAction}>
              <input
                type="hidden"
                name="notification_id"
                value={notification.id}
              />
              <button
                type="submit"
                className="inline-flex min-h-10 items-center justify-center gap-2 rounded-lg border-2 border-[#140625] bg-[#ffdd3d] px-3 py-2 text-xs font-black uppercase text-[#140625] shadow-[3px_3px_0_#140625] transition hover:-translate-y-0.5 hover:bg-[#38e7ff]"
              >
                <Check aria-hidden="true" className="h-4 w-4" />
                {t("common.markRead")}
              </button>
            </form>
          ) : null}
        </div>
      </div>

      <p className="mt-4 break-all text-[0.7rem] font-black uppercase text-[#7c3cff]">
        {t(`notifications.type.${notification.type}` as TranslationKey)}
      </p>
    </article>
  );
}
