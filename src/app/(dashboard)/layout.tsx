"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { logout } from "@/actions/auth";
import { useEffect, useState } from "react";
import NotificationBell from "@/components/NotificationBell";
import MobileNav from "@/components/MobileNav";
import { getMyNotifications } from "@/actions/notifications";

const navItems = [
  { href: "/dashboard", label: "Dashboard", icon: "🏠" },
  { href: "/courses", label: "Courses", icon: "📚" },
  { href: "/schedule", label: "Schedule", icon: "📅" },
  { href: "/announcements", label: "Announcements", icon: "📢" },
  { href: "/profile", label: "Profile", icon: "👤" },
];

const adminNavItems = [
  { href: "/admin/users", label: "User Management", icon: "👥" },
];

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const pathname = usePathname();
  const [role, setRole] = useState<string | null>(null);
  const [unreadCount, setUnreadCount] = useState(0);

  useEffect(() => {
    // Get role from cookie or session
    // For simplicity, we'll check if the pathname starts with /admin
    // The middleware will handle access control anyway
    const fetchRole = async () => {
      try {
        const res = await fetch("/api/auth/session");
        const session = await res.json();
        if (session?.user?.role) {
          setRole(session.user.role);
        }
      } catch {
        // Ignore errors
      }
    };
    fetchRole();
  }, []);

  useEffect(() => {
    let active = true;
    async function load() {
      try {
        const data = await getMyNotifications();
        if (active) setUnreadCount(data.unreadCount);
      } catch {
        // not logged in or transient error — ignore
      }
    }
    load();
    const interval = setInterval(load, 60000);
    return () => {
      active = false;
      clearInterval(interval);
    };
  }, [pathname]);

  const isAdmin = role === "ADMIN" || pathname.startsWith("/admin");

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Mobile top header */}
      <header className="sticky top-0 z-40 flex items-center justify-between border-b bg-white px-4 py-3 md:hidden">
        <Link href="/dashboard" className="text-lg font-bold text-gray-900">
          Piwulangan
        </Link>
        <div className="flex items-center gap-4">
          <Link
            href="/notifications"
            aria-label="Notifications"
            className={`relative text-xl ${
              pathname.startsWith("/notifications") ? "" : "opacity-70"
            }`}
          >
            🔔
            {unreadCount > 0 && (
              <span className="absolute -right-2.5 -top-1.5 flex h-5 min-w-[20px] items-center justify-center rounded-full bg-red-500 px-1 text-[11px] font-bold text-white">
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
              className="rounded-md border px-3 py-1.5 text-sm font-medium text-gray-600"
            >
              Sign Out
            </button>
          </form>
        </div>
      </header>

      <div className="flex">
        {/* Sidebar (desktop) */}
        <aside className="hidden md:flex w-64 flex-col border-r bg-white min-h-screen">
          <div className="p-4 border-b">
            <Link href="/dashboard" className="text-xl font-bold text-gray-900">
              Piwulangan
            </Link>
          </div>

          <nav className="flex-1 p-4 space-y-1">
            {navItems.map((item) => (
              <Link
                key={item.href}
                href={item.href}
                className={`flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition-colors ${
                  pathname === item.href
                    ? "bg-blue-50 text-blue-700"
                    : "text-gray-600 hover:bg-gray-100"
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
                  <p className="px-3 text-xs font-semibold text-gray-400 uppercase tracking-wider">
                    Admin
                  </p>
                </div>
                {adminNavItems.map((item) => (
                  <Link
                    key={item.href}
                    href={item.href}
                    className={`flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition-colors ${
                      pathname === item.href
                        ? "bg-purple-50 text-purple-700"
                        : "text-gray-600 hover:bg-gray-100"
                    }`}
                  >
                    <span>{item.icon}</span>
                    {item.label}
                  </Link>
                ))}
              </>
            )}
          </nav>

          <div className="p-4 border-t">
            <form action={logout}>
              <button
                type="submit"
                className="w-full text-left text-sm text-gray-600 hover:text-gray-900"
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
  );
}
