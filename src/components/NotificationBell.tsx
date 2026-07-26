"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  getMyNotifications,
  markRead,
  markAllRead,
} from "@/actions/notifications";

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

export default function NotificationBell() {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [unreadCount, setUnreadCount] = useState(0);
  const [notifications, setNotifications] = useState<NotificationItem[]>([]);
  const containerRef = useRef<HTMLDivElement>(null);

  const load = useCallback(async () => {
    try {
      const data = await getMyNotifications();
      setUnreadCount(data.unreadCount);
      setNotifications(data.notifications);
    } catch {
      // not logged in or transient error — ignore
    }
  }, []);

  useEffect(() => {
    load();
    const interval = setInterval(load, 60000);
    return () => clearInterval(interval);
  }, [load]);

  useEffect(() => {
    function onClickOutside(e: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    }
    document.addEventListener("mousedown", onClickOutside);
    return () => document.removeEventListener("mousedown", onClickOutside);
  }, []);

  async function handleClick(n: NotificationItem) {
    setOpen(false);
    if (!n.read) {
      await markRead(n.id);
      load();
    }
    if (n.link) router.push(n.link);
  }

  async function handleMarkAll() {
    await markAllRead();
    load();
  }

  return (
    <div ref={containerRef} className="relative">
      <button
        onClick={() => setOpen((o) => !o)}
        className="flex w-full items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium text-gray-600 hover:bg-gray-100 transition-colors"
      >
        <span>🔔</span>
        Notifications
        {unreadCount > 0 && (
          <span className="ml-auto rounded-full bg-red-500 px-2 py-0.5 text-xs font-semibold text-white">
            {unreadCount > 99 ? "99+" : unreadCount}
          </span>
        )}
      </button>

      {open && (
        <div className="absolute left-full top-0 z-50 ml-2 w-80 rounded-lg border bg-white shadow-lg">
          <div className="flex items-center justify-between border-b px-4 py-2">
            <span className="text-sm font-semibold text-gray-900">
              Notifications
            </span>
            {unreadCount > 0 && (
              <button
                onClick={handleMarkAll}
                className="text-xs text-blue-600 hover:underline"
              >
                Mark all read
              </button>
            )}
          </div>
          <div className="max-h-96 overflow-y-auto divide-y">
            {notifications.length === 0 && (
              <p className="px-4 py-6 text-center text-sm text-gray-400">
                No notifications
              </p>
            )}
            {notifications.map((n) => (
              <button
                key={n.id}
                onClick={() => handleClick(n)}
                className={`block w-full px-4 py-3 text-left hover:bg-gray-50 ${
                  n.read ? "" : "bg-blue-50"
                }`}
              >
                <p className="text-sm text-gray-900">
                  {TYPE_ICONS[n.type] || "🔔"} {n.title}
                </p>
                {n.body && (
                  <p className="mt-0.5 text-xs text-gray-500 line-clamp-2">
                    {n.body}
                  </p>
                )}
                <p className="mt-0.5 text-xs text-gray-400">
                  {new Date(n.createdAt).toLocaleString()}
                </p>
              </button>
            ))}
          </div>
          <div className="border-t px-4 py-2 text-center">
            <Link
              href="/notifications"
              onClick={() => setOpen(false)}
              className="text-xs font-medium text-blue-600 hover:underline"
            >
              View all →
            </Link>
          </div>
        </div>
      )}
    </div>
  );
}
