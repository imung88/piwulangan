"use client"

import { useEffect, useRef, useState } from "react"
import Link from "next/link"
import { useRouter } from "next/navigation"
import { markRead, markAllRead } from "@/actions/notifications"
import { useT } from "@/lib/i18n/useT"

export interface NotificationItem {
  id: string
  type: string
  title: string
  body: string | null
  link: string | null
  read: boolean
  createdAt: string
}

const TYPE_ICONS: Record<string, string> = {
  SESSION: "📅",
  ANNOUNCEMENT: "📢",
  ENROLLMENT: "📚",
  ATTENDANCE: "📋",
}

export default function NotificationBell({
  unreadCount,
  notifications,
  onRefresh,
}: {
  unreadCount: number
  notifications: NotificationItem[]
  onRefresh: () => void
}) {
  const t = useT()
  const router = useRouter()
  const [open, setOpen] = useState(false)
  const containerRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    function onClickOutside(e: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setOpen(false)
      }
    }
    document.addEventListener("mousedown", onClickOutside)
    return () => document.removeEventListener("mousedown", onClickOutside)
  }, [])

  async function handleClick(n: NotificationItem) {
    setOpen(false)
    if (!n.read) {
      await markRead(n.id)
      onRefresh()
    }
    if (n.link) router.push(n.link)
  }

  async function handleMarkAll() {
    await markAllRead()
    onRefresh()
  }

  return (
    <div ref={containerRef} className="relative">
      <button
        onClick={() => setOpen((o) => !o)}
        className="flex w-full items-center gap-3 px-6 py-2.5 text-sm font-medium text-white/80 hover:bg-metro-blue-hover hover:text-white transition-colors"
      >
        <span>🔔</span>
        {t("bell.notifications")}
        {unreadCount > 0 && (
          <span className="ml-auto bg-metro-error px-2 py-0.5 text-xs font-semibold text-white">
            {unreadCount > 99 ? "99+" : unreadCount}
          </span>
        )}
      </button>

      {open && (
        <div className="absolute left-full top-0 z-50 ml-2 w-80 border border-metro-border bg-metro-surface shadow-lg">
          <div className="flex items-center justify-between border-b border-metro-border px-4 py-2">
            <span className="text-sm font-semibold text-metro-text">
              {t("bell.notifications")}
            </span>
            {unreadCount > 0 && (
              <button
                onClick={handleMarkAll}
                className="text-xs text-metro-blue hover:underline"
              >
                {t("bell.markAllRead")}
              </button>
            )}
          </div>
          <div className="max-h-96 overflow-y-auto divide-y divide-metro-border">
            {notifications.length === 0 && (
              <p className="px-4 py-6 text-center text-sm text-metro-text-secondary">
                {t("bell.noNotifications")}
              </p>
            )}
            {notifications.map((n) => (
              <button
                key={n.id}
                onClick={() => handleClick(n)}
                className={`block w-full px-4 py-3 text-left hover:bg-metro-blue-light ${
                  n.read ? "" : "bg-metro-blue-light"
                }`}
              >
                <p className="text-sm text-metro-text">
                  {TYPE_ICONS[n.type] || "🔔"} {n.title}
                </p>
                {n.body && (
                  <p className="mt-0.5 text-xs text-metro-text-secondary line-clamp-2">
                    {n.body}
                  </p>
                )}
                <p className="mt-0.5 text-xs text-metro-text-secondary">
                  {new Date(n.createdAt).toLocaleString()}
                </p>
              </button>
            ))}
          </div>
          <div className="border-t border-metro-border px-4 py-2 text-center">
            <Link
              href="/notifications"
              onClick={() => setOpen(false)}
              className="text-xs font-medium text-metro-blue hover:underline"
            >
              {t("bell.viewAll")}
            </Link>
          </div>
        </div>
      )}
    </div>
  )
}
