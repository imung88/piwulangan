"use client"

import Link from "next/link"
import { usePathname } from "next/navigation"
import { useT } from "@/lib/i18n/useT"

const items = [
  { href: "/dashboard", key: "nav.dashboard", icon: "🏠" },
  { href: "/courses", key: "nav.courses", icon: "📚" },
  { href: "/schedule", key: "nav.schedule", icon: "📅" },
  { href: "/announcements", key: "nav.announcements", icon: "📢" },
  { href: "/profile", key: "nav.profile", icon: "👤" },
]

export default function MobileNav() {
  const t = useT()
  const pathname = usePathname()

  return (
    <nav
      className="fixed inset-x-0 bottom-0 z-40 bg-metro-blue md:hidden"
      style={{ paddingBottom: "env(safe-area-inset-bottom)" }}
    >
      <div className="grid grid-cols-5">
        {items.map((item) => {
          const active =
            pathname === item.href || pathname.startsWith(item.href + "/")
          return (
            <Link
              key={item.href}
              href={item.href}
              className={`flex min-h-[64px] flex-col items-center justify-center gap-0.5 transition-colors ${
                active ? "bg-metro-chrome-dark text-white" : "text-white/70"
              }`}
            >
              <span className="text-2xl leading-none">{item.icon}</span>
              <span
                className={`text-xs ${
                  active ? "font-semibold" : "font-medium"
                }`}
              >
                {t(item.key)}
              </span>
            </Link>
          )
        })}
      </div>
    </nav>
  )
}
