// Client-side `t()` hook — sync, pre-bundles both locales.
// Interpolation helper for `{n}`, `{title}`, `{done}` ... placeholders in translations.
// Usage:
//   const t = useT();
//   <p>{t("nav.dashboard")}</p>
//   <p>{format(t("courses.moduleCount"), { n: 5 })}</p>
import { useMemo } from "react"
import { useLocale } from "./LocaleProvider"
import id from "./locales/id"
import en from "./locales/en"

const BUNDLE = { id, en }

function deepGet(obj: unknown, path: string): string {
  const keys = path.split(".")
  let current: unknown = obj
  for (const k of keys) {
    if (current && typeof current === "object" && k in current) {
      current = (current as Record<string, unknown>)[k]
    } else return path // missing key → return raw key as fallback
  }
  return typeof current === "string" ? current : String(current ?? path)
}

// Replace `{key}` placeholders with values from `params`.
// Unknown keys are left as-is so missing data is visible, not silently dropped.
export function format(str: string, params: Record<string, unknown>): string {
  return str.replace(/\{(\w+)\}/g, (_match, key) => {
    const v = params[key]
    return v !== undefined ? String(v) : `{${key}}`
  })
}

export function useT() {
  const [locale] = useLocale()
  return useMemo(() => (path: string) => deepGet(BUNDLE[locale], path), [locale])
}

// Returns 7 localized day names indexed 0..6 (Sunday..Saturday).
export function useDayNames(): string[] {
  const t = useT()
  return useMemo(
    () => [
      t("days.sunday"),
      t("days.monday"),
      t("days.tuesday"),
      t("days.wednesday"),
      t("days.thursday"),
      t("days.friday"),
      t("days.saturday"),
    ],
    [t],
  )
}
