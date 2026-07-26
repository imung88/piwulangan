"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

const items = [
  { href: "/dashboard", label: "Home", icon: "🏠" },
  { href: "/courses", label: "Courses", icon: "📚" },
  { href: "/schedule", label: "Schedule", icon: "📅" },
  { href: "/announcements", label: "News", icon: "📢" },
  { href: "/profile", label: "Profile", icon: "👤" },
];

export default function MobileNav() {
  const pathname = usePathname();

  return (
    <nav
      className="fixed inset-x-0 bottom-0 z-40 border-t bg-white md:hidden"
      style={{ paddingBottom: "env(safe-area-inset-bottom)" }}
    >
      <div className="grid grid-cols-5">
        {items.map((item) => {
          const active =
            pathname === item.href || pathname.startsWith(item.href + "/");
          return (
            <Link
              key={item.href}
              href={item.href}
              className={`flex min-h-[64px] flex-col items-center justify-center gap-0.5 ${
                active ? "text-blue-600" : "text-gray-500"
              }`}
            >
              <span className="text-2xl leading-none">{item.icon}</span>
              <span
                className={`text-xs ${active ? "font-semibold" : "font-medium"}`}
              >
                {item.label}
              </span>
            </Link>
          );
        })}
      </div>
    </nav>
  );
}
