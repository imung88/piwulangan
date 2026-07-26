"use client"

import Link from "next/link"
import { usePathname } from "next/navigation"
import { logout } from "@/actions/auth"
import { useEffect, useState } from "react"
import NotificationBell from "@/components/NotificationBell"
import MobileNav from "@/components/MobileNav"
import { getMyNotifications } from "@/actions/notifications"

const navItems = [
  { href: "/dashboard", label: "Dashboard", icon: "🏠" },
  { href: "/courses", label: "Courses", icon: "📚" },
  { href: "/schedule", label: "Schedule", icon: "📅" },
  { href: "/announcements", label: "Announcements", icon: "📢" },
  { href: "/profile", label: "Profile", icon: "👤" },
]

const adminNavItems = [
  { href: "/admin/users", label: "User Management", icon: "👥" },
]

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const pathname = usePathname()
  const [role, setRole] = useState<string | null>(null)
  const [userName, setUserName] = useState<string | null>(null)
  const [unreadCount, setUnreadCount] = useState(0)

  useEffect(() => {
    const fetchSession = async () => {
      try {
        const res = await fetch("/api/auth/session")
        const session = await res.json()
        if (session?.user?.role) {
          setRole(session.user.role)
        }
        if (session?.user?.name) {
          setUserName(session.user.name)
        }
      } catch {
        // Ignore errors
      }
    }
    fetchSession()
  }, [])

  useEffect(() => {
    let active = true
    async function load() {
      try {
        const data = await getMyNotifications()
        if (active) setUnreadCount(data.unreadCount)
      } catch {
        // not logged in or transient error — ignore
      }
    }
    load()
    const interval = setInterval(load, 60000)
    return () => {
      active = false
      clearInterval(interval)
    }
  }, [pathname])

  const isAdmin = role === "ADMIN" || pathname.startsWith("/admin")

  function roleBadge(r: string | null) {
    switch (r) {
      case "ADMIN":
        return { label: "Admin" }
      case "INSTRUCTOR":
        return { label: "Instructor" }
      case "STUDENT":
        return { label: "Student" }
      case "GUARDIAN":
        return { label: "Guardian" }
      default:
        return { label: "" }
    }
  }

  const displayName = userName && userName.length > 12 ? userName.slice(0, 12) + "…" : userName

  return (
    <div className="min-h-screen bg-metro-bg">
      {/* Mobile top header */}
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
                  {roleBadge(role).label}
                </span>
              )}
            </div>
          )}
          <Link
            href="/notifications"
            aria-label="Notifications"
            className={`relative text-xl ${
              pathname.startsWith("/notifications") ? "" : "opacity-70"
            }`}
          >
            🔔
            {unreadCount > 0 && (
              <span className="absolute -right-2.5 -top-1.5 flex h-5 min-w-[20px] items-center justify-center bg-metro-error px-1 text-[11px] font-bold text-white">
                {unreadCount > 99 ? "99+" : unreadCount}
              </span>
            )}
          </Link>
          {isAdmin && (
            <Link href="/admin/users" aria-label="User Management" className="text-xl opacity-70">
              👥
            </Link>
          )}
          <form action={logout}>
            <button
              type="submit"
              className="px-3 py-1.5 text-sm font-medium text-white/80 hover:text-white"
            >
              Sign Out
            </button>
          </form>
        </div>
      </header>

      <div className="flex">
        {/* Sidebar (desktop) */}
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

            <NotificationBell />

            {isAdmin && (
              <>
                <div className="pt-4 pb-2">
                  <p className="px-6 text-xs font-semibold text-white/60 uppercase tracking-wider">
                    Admin
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
                      {roleBadge(role).label}
                    </span>
                  )}
                </div>
              </div>
            )}
            <form action={logout}>
              <button
                type="submit"
                className="w-full text-left text-sm text-white/70 hover:text-white"
              >
                Sign Out
              </button>
            </form>
          </div>
        </aside>

        {/* Main content */}
        <main className="min-w-0 flex-1 pb-24 md:pb-0">
          <div className="p-4 md:p-8">{children}</div>
        </main>
      </div>

      {/* Mobile bottom navigation */}
      <MobileNav />
    </div>
  )
}