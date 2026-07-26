"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { markRead, markAllRead } from "@/actions/notifications";

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
      <div className="rounded-lg border bg-white p-8 text-center">
        <p className="text-gray-500">No notifications yet.</p>
      </div>
    );
  }

  return (
    <div>
      {unread > 0 && (
        <div className="mb-4 flex items-center justify-between">
          <span className="text-sm text-gray-500">
            {unread} unread notification{unread !== 1 ? "s" : ""}
          </span>
          <button
            onClick={handleMarkAll}
            disabled={loading}
            className="text-sm font-medium text-blue-600 hover:underline disabled:opacity-50"
          >
            Mark all as read
          </button>
        </div>
      )}

      <div className="space-y-2">
        {notifications.map((n) => (
          <button
            key={n.id}
            onClick={() => handleClick(n)}
            className={`block w-full rounded-lg border p-4 text-left transition-colors hover:bg-gray-50 ${
              n.read ? "bg-white" : "border-blue-200 bg-blue-50"
            }`}
          >
            <div className="flex items-start gap-3">
              <span className="text-lg">{TYPE_ICONS[n.type] || "🔔"}</span>
              <div className="flex-1">
                <p className={`text-sm ${n.read ? "text-gray-700" : "font-medium text-gray-900"}`}>
                  {n.title}
                </p>
                {n.body && (
                  <p className="mt-0.5 text-sm text-gray-500">{n.body}</p>
                )}
                <p className="mt-1 text-xs text-gray-400">
                  {new Date(n.createdAt).toLocaleString()}
                </p>
              </div>
              {!n.read && (
                <span className="mt-1 h-2 w-2 rounded-full bg-blue-500" />
              )}
            </div>
          </button>
        ))}
      </div>
    </div>
  );
}
