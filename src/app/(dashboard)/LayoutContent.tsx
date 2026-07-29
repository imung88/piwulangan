"use client"

import Link from "next/link"
import { usePathname } from "next/navigation"
import { logout } from "@/actions/auth"
import { useCallback, useEffect, useState } from "react"
import LocaleProvider from "@/lib/i18n/LocaleProvider"
import NotificationBell, { type NotificationItem } from "@/components/NotificationBell"
import MobileNav from "@/components/MobileNav"
import { getMyNotifications } from "@/actions/notifications"
import { useT } from "@/lib/i18n/useT"

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

function roleBadgeLabel(role: string | null, t: (p: string) => string) {
  if (!role) return ""
  const map: Record<string, string> = {
    ADMIN: t("roles.admin"),
    INSTRUCTOR: t("roles.instructor"),
    STUDENT: t("roles.student"),
    GUARDIAN: t("roles.guardian"),
  }
  return map[role] ?? ""
}

function LayoutBody({ children, role, userName }: Props) {
  const t = useT()
  const navItems = buildNavItems(t)
  const adminNavItems = buildAdminNavItems(t)
  const pathname = usePathname()
  const [unreadCount, setUnreadCount] = useState(0)
  const [notifications, setNotifications] = useState<NotificationItem[]>([])

  const loadNotifications = useCallback(async () => {
    try {
      const data = await getMyNotifications()
      setUnreadCount(data.unreadCount)
      setNotifications(data.notifications)
    } catch {}
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
      <header className="sticky top-0 z-40 flex items-center justify-between bg-metro-blue px-4 py-3 md:hidden">
        <Link href="/dashboard" className="text-lg font-light lowercase tracking-tight text-white">
          piwulangan
        </Link>
        <div className="flex items-center gap-3">
          {userName && (
            <div className="flex flex-col shrink-0">
              <p className="text-sm font-semibold text-white truncate max-w-[100px]">
                {displayName}
              </p>
              {role && (
                <span className="metro-badge mt-0.5 bg-white/20 text-white leading-none">
                  {roleBadgeLabel(role, t)}
                </span>
              )}
            </div>
          )}
          <Link
            href="/notifications"
            aria-label={t("nav.notifications")}
            className={`relative text-xl ${pathname.startsWith("/notifications") ? "" : "opacity-70"}`}
          >
            🔔
            {unreadCount > 0 && (
              <span className="absolute -right-2.5 -top-1.5 flex h-5 min-w-[20px] items-center justify-center bg-metro-error px-1 text-[11px] font-bold text-white">
                {unreadCount > 99 ? "99+" : unreadCount}
              </span>
            )}
          </Link>
          {isAdmin && (
            <Link href="/admin/users" aria-label={t("nav.userManagement")} className="text-xl opacity-70">
              👥
            </Link>
          )}
          <form action={logout}>
            <button type="submit" className="px-3 py-1.5 text-sm font-medium text-white/80 hover:text-white">
              {t("nav.signOut")}
            </button>
          </form>
        </div>
      </header>

      <div className="flex">
        <aside className="hidden md:flex w-64 flex-col bg-metro-blue min-h-screen">
          <div className="p-6">
            <Link href="/dashboard" className="text-2xl font-light lowercase tracking-tight text-white">
              piwulangan
            </Link>
          </div>

          <nav className="flex-1 py-2">
            {navItems.map((item) => (
              <Link
                key={item.href}
                href={item.href}
                className={`flex items-center gap-3 px-6 py-2.5 text-sm font-medium transition-colors ${
                  pathname === item.href
                    ? "bg-metro-chrome-dark text-white"
                    : "text-white/80 hover:bg-metro-blue-hover hover:text-white"
                }`}
              >
                <span>{item.icon}</span>
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
                  <p className="px-6 text-xs font-semibold text-white/60 uppercase tracking-wider">
                    {t("nav.admin")}
                  </p>
                </div>
                {adminNavItems.map((item) => (
                  <Link
                    key={item.href}
                    href={item.href}
                    className={`flex items-center gap-3 px-6 py-2.5 text-sm font-medium transition-colors ${
                      pathname === item.href
                        ? "bg-metro-chrome-dark text-white"
                        : "text-white/80 hover:bg-metro-blue-hover hover:text-white"
                    }`}
                  >
                    <span>{item.icon}</span>
                    {item.label}
                  </Link>
                ))}
              </>
            )}
          </nav>

          <div className="p-6 border-t border-white/20">
            {userName && (
              <div className="flex items-center gap-3 mb-3">
                <div className="flex h-9 w-9 shrink-0 items-center justify-center bg-metro-chrome-dark text-sm font-semibold text-white">
                  {userName.charAt(0).toUpperCase()}
                </div>
                <div className="min-w-0">
                  <p className="text-sm font-medium text-white truncate">{displayName}</p>
                  {role && (
                    <span className="metro-badge mt-0.5 bg-white/20 text-white">
                      {roleBadgeLabel(role, t)}
                    </span>
                  )}
                </div>
              </div>
            )}
            <form action={logout}>
              <button type="submit" className="w-full text-left text-sm text-white/70 hover:text-white">
                {t("nav.signOut")}
              </button>
            </form>
          </div>
        </aside>

        <main className="min-w-0 flex-1 pb-24 md:pb-0">
          <div className="p-4 md:p-8">{children}</div>
        </main>
      </div>

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
      <LayoutBody role={role} userName={userName}>{children}</LayoutBody>
    </LocaleProvider>
  )
}
