import { createClient } from "@/utils/supabase/server";

export const NOTIFICATION_LIMIT = 50;

export type DbNotification = {
  id: string;
  user_id: string | null;
  type: string;
  title: string;
  body: string;
  link_url: string | null;
  read_at: string | null;
  created_at: string;
};

export type NotificationItem = DbNotification & {
  effective_read_at: string | null;
  is_global: boolean;
};

export type NotificationReadReceipt = {
  notification_id: string;
  read_at: string;
};

export const NOTIFICATION_COLUMNS =
  "id, user_id, type, title, body, link_url, read_at, created_at";

function sortByCreatedDesc(a: DbNotification, b: DbNotification) {
  return (
    new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
  );
}

export async function loadNotifications(limit = NOTIFICATION_LIMIT) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) return null;

  const safeLimit = Math.min(Math.max(limit, 1), NOTIFICATION_LIMIT);

  const [{ data: userRows }, { data: globalRows }] = await Promise.all([
    supabase
      .from("notifications")
      .select(NOTIFICATION_COLUMNS)
      .eq("user_id", user.id)
      .order("created_at", { ascending: false })
      .limit(safeLimit),
    supabase
      .from("notifications")
      .select(NOTIFICATION_COLUMNS)
      .is("user_id", null)
      .order("created_at", { ascending: false })
      .limit(safeLimit),
  ]);

  const ownNotifications = (userRows ?? []) as DbNotification[];
  const globalNotifications = (globalRows ?? []) as DbNotification[];
  const globalIds = globalNotifications.map((notification) => notification.id);
  const globalReadAt = new Map<string, string>();

  if (globalIds.length > 0) {
    const { data: receipts } = await supabase
      .from("notification_reads")
      .select("notification_id, read_at")
      .eq("user_id", user.id)
      .in("notification_id", globalIds);

    for (const receipt of (receipts ?? []) as NotificationReadReceipt[]) {
      globalReadAt.set(receipt.notification_id, receipt.read_at);
    }
  }

  const notifications: NotificationItem[] = [
    ...ownNotifications.map((notification) => ({
      ...notification,
      effective_read_at: notification.read_at,
      is_global: false,
    })),
    ...globalNotifications.map((notification) => ({
      ...notification,
      effective_read_at:
        globalReadAt.get(notification.id) ?? notification.read_at,
      is_global: true,
    })),
  ]
    .sort(sortByCreatedDesc)
    .slice(0, safeLimit);

  return {
    userId: user.id,
    notifications,
    unreadCount: notifications.filter(
      (notification) => !notification.effective_read_at,
    ).length,
  };
}

export async function getUnreadNotificationCount() {
  try {
    const data = await loadNotifications(NOTIFICATION_LIMIT);
    return data?.unreadCount ?? 0;
  } catch {
    return 0;
  }
}
