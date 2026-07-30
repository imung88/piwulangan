"use client"

import { useT } from "@/lib/i18n/useT"

// App-wide role color convention:
// admin=purple, instructor=navy, student=metro green, guardian=deep yellow
export const ROLE_BADGE_STYLES: Record<string, string> = {
  ADMIN: "bg-metro-role-admin text-white",
  INSTRUCTOR: "bg-metro-role-instructor text-white",
  STUDENT: "bg-metro-role-student text-white",
  GUARDIAN: "bg-metro-role-guardian text-white",
}

export const ROLE_LABEL_KEYS: Record<string, string> = {
  ADMIN: "roles.admin",
  INSTRUCTOR: "roles.instructor",
  STUDENT: "roles.student",
  GUARDIAN: "roles.guardian",
}

export default function RoleBadge({ role, className }: { role: string | null; className?: string }) {
  const t = useT()
  const key = role ?? ""
  if (!ROLE_LABEL_KEYS[key]) return <span className="text-metro-text-secondary">Unknown</span>
  return (
    <span className={`metro-badge ${ROLE_BADGE_STYLES[key]} ${className ?? ""}`}>
      {t(ROLE_LABEL_KEYS[key])}
    </span>
  )
}
