"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { markRead, markAllRead } from "@/actions/notifications";
import { useT, format } from "@/lib/i18n/useT";

interface NotificationItem {
  id: string;
  type: string;
  title: string;
  body: string | null;
  link: string | null;
  read: boolean;
  createdAt: string;
}

const TYPE_ICONS: Record<string, string> = {
  SESSION: "📅",
  ANNOUNCEMENT: "📢",
  ENROLLMENT: "📚",
  ATTENDANCE: "📋",
};

export default function NotificationsClient({
  notifications,
}: {
  notifications: NotificationItem[];
}) {
  const t = useT();
  const router = useRouter();
  const [loading, setLoading] = useState(false);

  const unread = notifications.filter((n) => !n.read).length;

  async function handleClick(n: NotificationItem) {
    if (!n.read) {
      await markRead(n.id);
      router.refresh();
    }
    if (n.link) router.push(n.link);
  }

  async function handleMarkAll() {
    setLoading(true);
    await markAllRead();
    setLoading(false);
    router.refresh();
  }

  if (notifications.length === 0) {
    return (
      <div className="metro-card p-8 text-center">
        <p className="text-metro-text-secondary">{t("notificationsPage.noNotifications")}</p>
      </div>
    );
  }

  const unreadLabel =
    unread === 1
      ? t("notificationsPage.unreadSingle")
      : t("notificationsPage.unread");

  return (
    <div>
      {unread > 0 && (
        <div className="mb-4 flex items-center justify-between">
          <span className="text-sm text-metro-text-secondary">
            {format(unreadLabel, { n: unread })}
          </span>
          <button
            onClick={handleMarkAll}
            disabled={loading}
            className="text-sm font-medium text-metro-blue hover:underline disabled:opacity-50"
          >
            {t("notificationsPage.markAllRead")}
          </button>
        </div>
      )}

      <div className="space-y-2">
        {notifications.map((n) => (
          <button
            key={n.id}
            onClick={() => handleClick(n)}
            className={`w-full text-left ${
              n.read
                ? "metro-card hover:bg-metro-bg"
                : "metro-card metro-card-accent bg-metro-blue-light hover:bg-metro-blue-light"
            }`}
          >
            <div className="flex items-start gap-3">
              <span className="text-lg">{TYPE_ICONS[n.type] || "🔔"}</span>
              <div className="flex-1">
                <p className={`text-sm ${n.read ? "text-metro-text-secondary" : "font-medium text-metro-text"}`}>
                  {n.title}
                </p>
                {n.body && (
                  <p className="mt-0.5 text-sm text-metro-text-secondary">{n.body}</p>
                )}
                <p className="mt-1 text-xs text-metro-text-secondary">
                  {new Date(n.createdAt).toLocaleString()}
                </p>
              </div>
              {!n.read && (
                <span className="mt-1 h-2 w-2 bg-metro-blue" />
              )}
            </div>
          </button>
        ))}
      </div>
    </div>
  );
}
