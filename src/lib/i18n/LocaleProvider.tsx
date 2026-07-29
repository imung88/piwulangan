"use client"
import { createContext, useContext, useMemo, useState, useEffect } from "react"

type Locale = "id" | "en"
const DEFAULT: Locale = "id"
const SUPPORTED: Locale[] = ["id", "en"]

function readCookie(): Locale {
  if (typeof document === "undefined") return DEFAULT
  const m = document.cookie.match(/(?:^|;\s*)lang=([^;]+)/)
  return (m?.[1] ?? DEFAULT) as Locale
}

type SetLocale = (l: Locale) => void
const Ctx = createContext<[Locale, SetLocale]>(["id", () => {}])

export function useLocale(): [Locale, SetLocale] {
  return useContext(Ctx)
}

export default function LocaleProvider({
  initial,
  children,
}: {
  initial: Locale
  children: React.ReactNode
}) {
  const [locale, setLocale] = useState<Locale>(initial)

  const handler: SetLocale = useMemo(
    () => (l: Locale) => {
      if (!SUPPORTED.includes(l)) return
      document.cookie = `lang=${l}; path=/; max-age=31536000; SameSite=Lax`
      setLocale(l)
      window.dispatchEvent(new Event("localechange"))
    },
    [],
  )

  useEffect(() => {
    const sync = () => setLocale(readCookie())
    window.addEventListener("localechange", sync)
    window.addEventListener("storage", sync)
    return () => {
      window.removeEventListener("localechange", sync)
      window.removeEventListener("storage", sync)
    }
  }, [])

  return <Ctx.Provider value={[locale, handler]}>{children}</Ctx.Provider>
}
