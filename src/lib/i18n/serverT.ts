/**
 * @module lib/i18n/serverT
 * @overview Server-safe internationalization and locale resolution for Next.js server components.
 * @responsibilities
 *   - Resolve current locale from request cookies
 *   - Load translation dictionaries (Indonesian / English) on the server
 *   - Format translation strings with placeholder parameters
 * @exports
 *   - `resolveLocale`: Resolves locale from headers
 *   - `formatT`: Interpolates parameters into translation strings
 *   - `getServerT`: Returns a synchronous translation function for server components
 *   - `serverT`: Translates a path string asynchronously
 */
// Server-safe locale resolver for Next.js server components.
// Reads the `lang` cookie from the request headers so a server component
// can pick the correct dictionary for static labels.
import { headers } from "next/headers"
import id from "./locales/id"
import en from "./locales/en"

const DICTS = { id, en } as const
const DEFAULT: "id" | "en" = "id"

export async function resolveLocale(): Promise<"id" | "en"> {
  const h = await headers()
  const cookie = h.get("cookie") ?? ""
  const m = cookie.match(/(?:^|;\s*)lang=([^;]+)/)
  return (m?.[1] ?? DEFAULT) as "id" | "en"
}

// Fill `{key}` placeholders into a serverT string, mirroring the client `format()`.
export function formatT(str: string, params: Record<string, unknown>): string {
  return str.replace(/\{(\w+)\}/g, (_match, key) => {
    const v = params[key]
    return v !== undefined ? String(v) : `{${key}}`
  })
}

function deepGet(dict: unknown, path: string): string {
  const keys = path.split(".")
  let current: unknown = dict
  for (const k of keys) {
    if (current && typeof current === "object" && k in current) {
      current = (current as Record<string, unknown>)[k]
    } else return path
  }
  return typeof current === "string" ? current : String(current ?? path)
}

// Resolve the locale once, then translate synchronously.
// Preferred in pages: `const t = await getServerT()` then `t("nav.dashboard")`.
export async function getServerT(): Promise<(path: string) => string> {
  const locale = await resolveLocale()
  const dict = DICTS[locale]
  return (path: string) => deepGet(dict, path)
}

export async function serverT(path: string): Promise<string> {
  const t = await getServerT()
  return t(path)
}
