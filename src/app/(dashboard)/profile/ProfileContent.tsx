"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { useT } from "@/lib/i18n/useT"
import LanguageSelector from "@/components/LanguageSelector"
import RoleBadge from "@/components/RoleBadge"
import { updateProfile } from "@/actions/profile"

type Props = {
  user: {
    name: string
    email: string | null
    phone: string | null
    address: string | null
    dateOfBirth: string | null
    notes: string | null
    role: string | null
  }
}

export default function ProfileContent({ user }: Props) {
  const t = useT()
  const router = useRouter()
  const [editing, setEditing] = useState(false)
  const [saving, setSaving] = useState(false)
  const [saved, setSaved] = useState(false)
  const [errors, setErrors] = useState<Record<string, string[]>>({})

  const displayName = user.name || "—"
  const initial = (displayName === "—" ? "?" : displayName).charAt(0).toUpperCase()
  const notSet = <span className="text-metro-text-secondary">{t("profile.notSet")}</span>

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    setErrors({})
    setSaved(false)
    setSaving(true)

    const result = await updateProfile(new FormData(e.currentTarget))
    setSaving(false)
    if (result?.error) {
      setErrors(result.error)
    } else {
      setEditing(false)
      setSaved(true)
      router.refresh()
    }
  }

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

        {!editing ? (
          <div className="space-y-4 p-8">
            <div>
              <p className="text-metro-text-secondary text-sm font-medium">{t("profile.name")}</p>
              <p className="text-lg text-metro-text">{displayName}</p>
            </div>
            <div>
              <p className="text-metro-text-secondary text-sm font-medium">{t("profile.email")}</p>
              <p className="text-lg text-metro-text">{user.email || notSet}</p>
            </div>
            <div>
              <p className="text-metro-text-secondary text-sm font-medium">{t("profile.phone")}</p>
              <p className="text-lg text-metro-text">{user.phone || notSet}</p>
            </div>
            <div>
              <p className="text-metro-text-secondary text-sm font-medium">{t("profile.address")}</p>
              <p className="text-lg text-metro-text">{user.address || notSet}</p>
            </div>
            <div>
              <p className="text-metro-text-secondary text-sm font-medium">{t("profile.dateOfBirth")}</p>
              <p className="text-lg text-metro-text">{user.dateOfBirth || notSet}</p>
            </div>
            <div>
              <p className="text-metro-text-secondary text-sm font-medium">{t("profile.notes")}</p>
              <p className="text-lg text-metro-text whitespace-pre-wrap">{user.notes || notSet}</p>
            </div>
            <div>
              <p className="text-metro-text-secondary text-sm font-medium">{t("profile.role")}</p>
              <RoleBadge role={user.role} />
            </div>
            {saved && <p className="text-sm font-medium text-metro-green">{t("profile.saved")}</p>}
            <button type="button" onClick={() => { setEditing(true); setSaved(false) }} className="metro-btn mt-2">
              {t("profile.edit")}
            </button>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="space-y-4 p-8">
            <div>
              <label htmlFor="name" className="block text-sm font-medium text-metro-text-secondary">
                {t("profile.name")}
              </label>
              <input id="name" name="name" type="text" required defaultValue={user.name} className="metro-input mt-1" />
              {errors.name && <p className="mt-1 text-sm text-metro-error">{errors.name[0]}</p>}
            </div>
            <div>
              <label htmlFor="email" className="block text-sm font-medium text-metro-text-secondary">
                {t("profile.email")}
              </label>
              <input id="email" name="email" type="email" defaultValue={user.email ?? ""} className="metro-input mt-1" />
              {errors.email && <p className="mt-1 text-sm text-metro-error">{errors.email[0]}</p>}
            </div>
            <div>
              <label htmlFor="phone" className="block text-sm font-medium text-metro-text-secondary">
                {t("profile.phone")}
              </label>
              <input id="phone" name="phone" type="tel" defaultValue={user.phone ?? ""} placeholder="0812xxxxxxx" className="metro-input mt-1" />
              {errors.phone && <p className="mt-1 text-sm text-metro-error">{errors.phone[0]}</p>}
            </div>
            <div>
              <label htmlFor="address" className="block text-sm font-medium text-metro-text-secondary">
                {t("profile.address")}
              </label>
              <textarea id="address" name="address" rows={2} defaultValue={user.address ?? ""} className="metro-input mt-1" />
              {errors.address && <p className="mt-1 text-sm text-metro-error">{errors.address[0]}</p>}
            </div>
            <div>
              <label htmlFor="dateOfBirth" className="block text-sm font-medium text-metro-text-secondary">
                {t("profile.dateOfBirth")}
              </label>
              <input id="dateOfBirth" name="dateOfBirth" type="date" defaultValue={user.dateOfBirth ?? ""} className="metro-input mt-1" />
              {errors.dateOfBirth && <p className="mt-1 text-sm text-metro-error">{errors.dateOfBirth[0]}</p>}
            </div>
            <div>
              <label htmlFor="notes" className="block text-sm font-medium text-metro-text-secondary">
                {t("profile.notes")}
              </label>
              <textarea id="notes" name="notes" rows={3} defaultValue={user.notes ?? ""} className="metro-input mt-1" />
              <p className="mt-1 text-xs text-metro-text-secondary">{t("profile.notesHint")}</p>
              {errors.notes && <p className="mt-1 text-sm text-metro-error">{errors.notes[0]}</p>}
            </div>
            {errors.form && <div className="metro-error">{errors.form[0]}</div>}
            <div className="flex gap-3">
              <button type="submit" disabled={saving} className="metro-btn">
                {saving ? t("profile.saving") : t("profile.save")}
              </button>
              <button
                type="button"
                onClick={() => { setEditing(false); setErrors({}) }}
                className="border-2 border-metro-border px-4 py-2 text-sm font-medium text-metro-text hover:bg-metro-bg"
              >
                {t("profile.cancel")}
              </button>
            </div>
          </form>
        )}
      </div>

      <h2 className="metro-section-title">{t("profile.settings")}</h2>
      <LanguageSelector />
    </div>
  )
}
