"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { logout } from "@/actions/auth";
import { useEffect, useState } from "react";

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

  const isAdmin = role === "ADMIN" || pathname.startsWith("/admin");

  return (
    <div className="flex min-h-screen bg-gray-50">
      {/* Sidebar */}
      <aside className="hidden md:flex w-64 flex-col border-r bg-white">
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
      <main className="flex-1">
        <div className="p-6 md:p-8">{children}</div>
      </main>
    </div>
  );
}
