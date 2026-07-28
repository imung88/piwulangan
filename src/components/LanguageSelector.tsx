// Language selector — shown on the Profile page.
// Two-option row (ID / EN) that writes the `lang` cookie.
"use client"

import { useLocale } from "@/lib/i18n/LocaleProvider"
import { useT } from "@/lib/i18n/useT"

export default function LanguageSelector() {
  const [locale, setLocale] = useLocale()
  const t = useT()

  const options = [
    { code: "id" as const, label: t("profile.langId"), flag: "🇮🇩" },
    { code: "en" as const, label: t("profile.langEn"), flag: "🇺🇸" },
  ]

  return (
    <div className="metro-card p-4">
      <p className="text-sm font-medium text-metro-text-secondary mb-3">
        {t("profile.language")}
      </p>
      <div className="grid grid-cols-2 gap-2">
        {options.map((opt) => {
          const active = locale === opt.code
          return (
            <button
              key={opt.code}
              type="button"
              onClick={() => setLocale(opt.code)}
              className={`
                flex items-center justify-center gap-2 rounded
                border px-3 py-3 text-sm font-medium transition-colors
                ${
                  active
                    ? "border-metro-blue bg-metro-blue/10 text-metro-blue"
                    : "border-metro-border text-metro-text-secondary hover:bg-metro-blue/5 hover:text-metro-text"
                }
              `}
              aria-pressed={active}
            >
              <span>{opt.flag}</span>
              <span>{opt.label}</span>
              {active && <span className="ml-auto text-metro-blue">✓</span>}
            </button>
          )
        })}
      </div>
    </div>
  )
}
