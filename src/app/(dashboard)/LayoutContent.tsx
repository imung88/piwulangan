"use client"

import Link from "next/link"
import { usePathname } from "next/navigation"
import { logout } from "@/actions/auth"
import { useCallback, useEffect, useState } from "react"
import LocaleProvider from "@/lib/i18n/LocaleProvider"
import NotificationBell, { type NotificationItem } from "@/components/NotificationBell"
import MobileNav from "@/components/MobileNav"
import RoleBadge from "@/components/RoleBadge"
import ToastProvider from "@/components/ui/Toast"
import ConfirmDialog from "@/components/ui/ConfirmDialog"
import { getMyNotifications } from "@/actions/notifications"
import { useT } from "@/lib/i18n/useT"
import { useAppTitle } from "@/lib/AppTitleContext"

type Props = {
  children: React.ReactNode
  role: string | null
  userName: string | null
}

function buildNavItems(t: (p: string) => string) {
  return [
    { href: "/dashboard", label: t("nav.dashboard"), icon: "🏠" },
    { href: "/courses", label: t("nav.courses"), icon: "📚" },
    { href: "/schedule", label: t("nav.schedule"), icon: "📅" },
    { href: "/announcements", label: t("nav.announcements"), icon: "📢" },
    { href: "/profile", label: t("nav.profile"), icon: "👤" },
  ]
}

function buildAdminNavItems(t: (p: string) => string) {
  return [
    { href: "/admin/users", label: t("nav.userManagement"), icon: "👥" },
  ]
}

function LayoutBody({ children, role, userName }: Props) {
  const t = useT()
  const appTitle = useAppTitle()
  const navItems = buildNavItems(t)
  const adminNavItems = buildAdminNavItems(t)
  const pathname = usePathname()
  const [unreadCount, setUnreadCount] = useState(0)
  const [notifications, setNotifications] = useState<NotificationItem[]>([])
  const [confirmSignOut, setConfirmSignOut] = useState(false)

  const loadNotifications = useCallback(async () => {
    const res = await getMyNotifications()
    if (!res.success) return
    setUnreadCount(res.data.unreadCount)
    setNotifications(res.data.notifications)
  }, [])

  useEffect(() => {
    loadNotifications()
    const interval = setInterval(loadNotifications, 60000)
    return () => clearInterval(interval)
  }, [loadNotifications])

  const isAdmin = role === "ADMIN" || pathname.startsWith("/admin")
  const displayName = userName && userName.length > 12 ? userName.slice(0, 12) + "…" : userName

  return (
    <div className="min-h-screen bg-metro-bg">
      <header className="sticky top-0 z-40 flex items-center justify-between bg-metro-blue px-4 py-1.5 md:hidden">
        <Link
          href="/dashboard"
          className="flex min-h-[44px] items-center text-lg font-light tracking-tight text-white"
        >
          {appTitle}
        </Link>
        <div className="flex items-center gap-2">
          {userName && (
            <div className="flex items-center gap-2">
              <div className="flex h-8 w-8 shrink-0 items-center justify-center bg-white text-sm font-bold text-metro-blue">
                {userName.charAt(0).toUpperCase()}
              </div>
              <div className="flex min-w-0 flex-col items-start">
                <span className="max-w-[110px] truncate text-sm font-medium text-white">
                  {displayName}
                </span>
                {role && <RoleBadge role={role} className="mt-0.5 !text-[9px] !px-1.5" />}
              </div>
            </div>
          )}
          <Link
            href="/notifications"
            aria-label={t("nav.notifications")}
            className={`relative flex min-h-[44px] min-w-[44px] items-center justify-center text-xl ${
              pathname.startsWith("/notifications") ? "bg-metro-chrome-dark" : ""
            }`}
          >
            <span aria-hidden="true">🔔</span>
            {unreadCount > 0 && (
              <span className="absolute right-0.5 top-1 flex h-5 min-w-[20px] items-center justify-center bg-metro-error px-1 text-[11px] font-bold text-white">
                {unreadCount > 99 ? "99+" : unreadCount}
              </span>
            )}
          </Link>
          {isAdmin && (
            <Link
              href="/admin/users"
              aria-label={t("nav.userManagement")}
              className={`flex min-h-[44px] min-w-[44px] items-center justify-center text-xl ${
                pathname.startsWith("/admin") ? "bg-metro-chrome-dark" : ""
              }`}
            >
              <span aria-hidden="true">👥</span>
            </Link>
          )}
          <button
            type="button"
            onClick={() => setConfirmSignOut(true)}
            className="flex min-h-[44px] items-center px-3 text-sm font-semibold text-white"
          >
            {t("nav.signOut")}
          </button>
        </div>
      </header>

      <div className="flex">
        <aside className="hidden md:flex w-64 flex-col bg-metro-blue min-h-screen">
          <div className="p-6">
            <Link href="/dashboard" className="text-2xl font-light tracking-tight text-white">
              {appTitle}
            </Link>
          </div>

          {/* User profile section — moved to top for visibility */}
          {userName && (
            <div className="mx-4 mb-4 flex items-center gap-3 bg-white/10 p-4">
              <div className="flex h-12 w-12 shrink-0 items-center justify-center bg-white text-lg font-bold text-metro-blue">
                {userName.charAt(0).toUpperCase()}
              </div>
              <div className="min-w-0 flex-1">
                <p className="text-sm font-semibold text-white truncate">{displayName}</p>
                {role && <RoleBadge role={role} className="mt-1" />}
              </div>
              <button
                type="button"
                onClick={() => setConfirmSignOut(true)}
                className="text-xs font-medium text-white/80 hover:text-white hover:underline"
              >
                {t("nav.signOut")}
              </button>
            </div>
          )}

          <nav className="flex-1 py-2">
            {navItems.map((item) => (
              <Link
                key={item.href}
                href={item.href}
                className={`flex items-center gap-3 px-6 py-2.5 text-sm font-medium transition-colors ${
                  pathname === item.href || pathname.startsWith(item.href + "/")
                    ? "bg-metro-chrome-dark text-white font-semibold"
                    : "text-white hover:bg-metro-blue-hover"
                }`}
              >
                <span aria-hidden="true">{item.icon}</span>
                {item.label}
              </Link>
            ))}
            <NotificationBell
              unreadCount={unreadCount}
              notifications={notifications}
              onRefresh={loadNotifications}
            />
            {isAdmin && (
              <>
                <div className="pt-4 pb-2">
                  <p className="px-6 text-xs font-semibold text-white/80 uppercase tracking-wider">
                    {t("nav.admin")}
                  </p>
                </div>
                {adminNavItems.map((item) => (
                  <Link
                    key={item.href}
                    href={item.href}
                    className={`flex items-center gap-3 px-6 py-2.5 text-sm font-medium transition-colors ${
                      pathname === item.href || pathname.startsWith(item.href + "/")
                        ? "bg-metro-chrome-dark text-white font-semibold"
                        : "text-white hover:bg-metro-blue-hover"
                    }`}
                  >
                    <span aria-hidden="true">{item.icon}</span>
                    {item.label}
                  </Link>
                ))}
              </>
            )}
          </nav>

        </aside>

        <main className="min-w-0 flex-1 pb-24 md:pb-0">
          <div className="p-4 md:p-8">{children}</div>
        </main>
      </div>

      <ConfirmDialog
        open={confirmSignOut}
        title={t("nav.signOutConfirm")}
        confirmLabel={t("nav.signOut")}
        cancelLabel={t("common.cancel")}
        onConfirm={() => logout()}
        onCancel={() => setConfirmSignOut(false)}
      />

      <MobileNav />
    </div>
  )
}

export default function LayoutContent({
  children,
  role,
  userName,
  initialLocale,
}: Props & { initialLocale: "id" | "en" }) {
  return (
    <LocaleProvider initial={initialLocale}>
      <ToastProvider>
        <LayoutBody role={role} userName={userName}>{children}</LayoutBody>
      </ToastProvider>
    </LocaleProvider>
  )
}
