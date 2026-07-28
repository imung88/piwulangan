"use client"

import { useT } from "@/lib/i18n/useT"

const BADGES: Record<string, { labelKey: string; color: string }> = {
  ADMIN: { labelKey: "roles.admin", color: "bg-metro-chrome-dark text-white" },
  INSTRUCTOR: { labelKey: "roles.instructor", color: "bg-metro-blue text-white" },
  STUDENT: { labelKey: "roles.student", color: "bg-metro-green text-white" },
  GUARDIAN: { labelKey: "roles.guardian", color: "bg-metro-blue-light text-metro-blue" },
}

export default function RoleBadge({ role }: { role: string | null }) {
  const t = useT()
  const entry = BADGES[role ?? ""]
  if (!entry) return <span className="text-metro-text-secondary">Unknown</span>
  return <span className={`metro-badge mt-1 ${entry.color}`}>{t(entry.labelKey)}</span>
}
