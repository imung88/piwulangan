"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { useT } from "@/lib/i18n/useT"
import LanguageSelector from "@/components/LanguageSelector"
import RoleBadge from "@/components/RoleBadge"
import { updateProfile, changePassword } from "@/actions/profile"

type Props = {
  canChangePassword: boolean
  canEditProfile: boolean
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

export default function ProfileContent({ user, canChangePassword, canEditProfile }: Props) {
  const t = useT()
  const router = useRouter()
  const [editing, setEditing] = useState(false)
  const [saving, setSaving] = useState(false)
  const [saved, setSaved] = useState(false)
  const [errors, setErrors] = useState<Record<string, string[]>>({})

  const [changingPw, setChangingPw] = useState(false)
  const [savingPw, setSavingPw] = useState(false)
  const [pwSaved, setPwSaved] = useState(false)
  const [pwErrors, setPwErrors] = useState<Record<string, string[]>>({})

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

  async function handlePasswordSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    setPwErrors({})
    setPwSaved(false)
    setSavingPw(true)

    const form = e.currentTarget
    const result = await changePassword(new FormData(form))
    setSavingPw(false)
    if (result?.error) {
      setPwErrors(result.error)
    } else {
      form.reset()
      setChangingPw(false)
      setPwSaved(true)
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
              <RoleBadge role={user.role} className="mt-1" />
            </div>
            {saved && <p className="text-sm font-medium text-metro-green">{t("profile.saved")}</p>}
            {canEditProfile ? (
              <button type="button" onClick={() => { setEditing(true); setSaved(false) }} className="metro-btn mt-2">
                {t("profile.edit")}
              </button>
            ) : (
              <p className="mt-2 text-sm text-metro-text-secondary">{t("profile.envManaged")}</p>
            )}
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

      <h2 className="metro-section-title">{t("profile.changePassword")}</h2>
      {!canChangePassword ? (
        <div className="metro-card p-6">
          <p className="text-sm text-metro-text-secondary">{t("profile.passwordEnvManaged")}</p>
        </div>
      ) : (
        <div className="metro-card p-6">
          {!changingPw ? (
            <div className="space-y-3">
              {pwSaved && <p className="text-sm font-medium text-metro-green">{t("profile.passwordChanged")}</p>}
              <button type="button" onClick={() => { setChangingPw(true); setPwSaved(false) }} className="metro-btn">
                {t("profile.changePassword")}
              </button>
            </div>
          ) : (
            <form onSubmit={handlePasswordSubmit} className="space-y-4">
              <div>
                <label htmlFor="currentPassword" className="block text-sm font-medium text-metro-text-secondary">
                  {t("profile.currentPassword")}
                </label>
                <input id="currentPassword" name="currentPassword" type="password" required autoComplete="current-password" className="metro-input mt-1" />
                {pwErrors.currentPassword && <p className="mt-1 text-sm text-metro-error">{pwErrors.currentPassword[0]}</p>}
              </div>
              <div>
                <label htmlFor="newPassword" className="block text-sm font-medium text-metro-text-secondary">
                  {t("profile.newPassword")}
                </label>
                <input id="newPassword" name="newPassword" type="password" required minLength={6} autoComplete="new-password" className="metro-input mt-1" />
                {pwErrors.newPassword && <p className="mt-1 text-sm text-metro-error">{pwErrors.newPassword[0]}</p>}
              </div>
              <div>
                <label htmlFor="confirmPassword" className="block text-sm font-medium text-metro-text-secondary">
                  {t("profile.confirmPassword")}
                </label>
                <input id="confirmPassword" name="confirmPassword" type="password" required minLength={6} autoComplete="new-password" className="metro-input mt-1" />
                {pwErrors.confirmPassword && <p className="mt-1 text-sm text-metro-error">{pwErrors.confirmPassword[0]}</p>}
              </div>
              {pwErrors.form && <div className="metro-error">{pwErrors.form[0]}</div>}
              <div className="flex gap-3">
                <button type="submit" disabled={savingPw} className="metro-btn">
                  {savingPw ? t("profile.saving") : t("profile.save")}
                </button>
                <button
                  type="button"
                  onClick={() => { setChangingPw(false); setPwErrors({}) }}
                  className="border-2 border-metro-border px-4 py-2 text-sm font-medium text-metro-text hover:bg-metro-bg"
                >
                  {t("profile.cancel")}
                </button>
              </div>
            </form>
          )}
        </div>
      )}

      <h2 className="metro-section-title">{t("profile.settings")}</h2>
      <LanguageSelector />
    </div>
  )
}
