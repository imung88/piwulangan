"use client"

import { useState } from "react"
import Link from "next/link"
import { useT } from "@/lib/i18n/useT"

export default function CourseActionsMenu({ courseId }: { courseId: string }) {
  const t = useT()
  const [open, setOpen] = useState(false)

  const items = [
    { href: `/courses/${courseId}/manage/students`, icon: "👥", label: t("courseDetail.manageStudents") },
    { href: `/courses/${courseId}/manage/schedule`, icon: "🗓️", label: t("courseDetail.manageSchedule") },
    { href: `/courses/${courseId}/manage/reports`, icon: "📝", label: t("courseDetail.manageReports") },
    { href: `/courses/${courseId}/manage/content`, icon: "✏️", label: t("courseDetail.manageContent") },
    { href: `/courses/${courseId}/announcements`, icon: "📣", label: t("courseDetail.announcements") },
    { href: `/courses/${courseId}/members`, icon: "🧑‍🤝‍🧑", label: t("members.title") },
    { href: `/courses/${courseId}/manage/settings`, icon: "⚙️", label: t("courseDetail.settings") },
  ]

  return (
    <div>
      <button
        onClick={() => setOpen((o) => !o)}
        className="flex w-full items-center justify-between bg-metro-blue px-4 py-2.5 text-sm font-medium text-white hover:bg-metro-blue-hover sm:w-64"
        aria-haspopup="menu"
        aria-expanded={open}
      >
        <span>
          <span className="mr-1.5 font-bold tracking-widest">⋯</span>
          {t("courseDetail.manage")}
        </span>
        <span className={"transition-transform " + (open ? "rotate-180" : "")}>▾</span>
      </button>
      {open && (
        <div className="w-full divide-y divide-metro-border border border-t-0 border-metro-border bg-metro-surface sm:w-64">
          {items.map((item) => (
            <Link
              key={item.href}
              href={item.href}
              onClick={() => setOpen(false)}
              className="block px-4 py-3 text-sm text-metro-text hover:bg-metro-blue-light"
            >
              <span className="mr-2">{item.icon}</span>
              {item.label}
            </Link>
          ))}
        </div>
      )}
    </div>
  )
}
