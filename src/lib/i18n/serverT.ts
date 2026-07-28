// Server-safe locale resolver for Next.js server components.
// Reads the `lang` cookie from the request headers so a server component
// can pick the correct dictionary for static labels.
import { headers } from "next/headers"
const DEFAULT: "id" | "en" = "id"

export async function resolveLocale(): Promise<"id" | "en"> {
  const h = await headers()
  const cookie = h.get("cookie") ?? ""
  const m = cookie.match(/(?:^|;\s*)lang=([^;]+)/)
  return (m?.[1] ?? DEFAULT) as "id" | "en"
}

// Server-safe dictionary lookup — mirrors the shape of the dict files.
// Fill `{key}` placeholders into a serverT string, mirroring the client `format()`.
export function formatT(str: string, params: Record<string, unknown>): string {
  return str.replace(/\{(\w+)\}/g, (_match, key) => {
    const v = params[key]
    return v !== undefined ? String(v) : `{${key}}`
  })
}

export async function serverT(path: string): Promise<string> {
  const [locale] = [await resolveLocale()]
  const { default: dict } =
    locale === "id"
      ? await import("./locales/id")
      : await import("./locales/en")
  const keys = path.split(".")
  let current: unknown = dict
  for (const k of keys) {
    if (current && typeof current === "object" && k in current) {
      current = (current as Record<string, unknown>)[k]
    } else return path
  }
  return typeof current === "string" ? current : String(current ?? path)
}
