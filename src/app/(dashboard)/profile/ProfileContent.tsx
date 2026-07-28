"use client"

import { useT } from "@/lib/i18n/useT"
import LanguageSelector from "@/components/LanguageSelector"
import RoleBadge from "@/components/RoleBadge"

type Props = { user: { name: string | null; email: string | null; role: string | null } }

export default function ProfileContent({ user }: Props) {
  const t = useT()
  const displayName = user.name || "—"
  const initial = (displayName === "—" ? "?" : displayName).charAt(0).toUpperCase()

  return (
    <div className="max-w-2xl mx-auto space-y-6">
      <h1 className="metro-page-title">{t("profile.title")}</h1>

      <div className="metro-card p-0">
        <div className="flex items-center gap-4 bg-metro-blue p-6">
          <div className="flex h-16 w-16 shrink-0 items-center justify-center bg-metro-chrome-dark text-3xl font-light text-white">
            {initial}
          </div>
          <p className="text-2xl font-light text-white">{displayName}</p>
        </div>

        <div className="space-y-4 p-8">
          <div>
            <p className="text-metro-text-secondary text-sm font-medium">{t("profile.name")}</p>
            <p className="text-lg text-metro-text">{displayName}</p>
          </div>
          <div>
            <p className="text-metro-text-secondary text-sm font-medium">{t("profile.email")}</p>
            <p className="text-lg text-metro-text">{user.email}</p>
          </div>
          <div>
            <p className="text-metro-text-secondary text-sm font-medium">{t("profile.role")}</p>
            <RoleBadge role={user.role} />
          </div>
        </div>
      </div>

      <h2 className="metro-section-title">{t("profile.settings")}</h2>
      <LanguageSelector />
    </div>
  )
}
