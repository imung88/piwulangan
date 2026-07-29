import { cookies } from "next/headers"
import { auth } from "@/lib/auth"
import LayoutContent from "./LayoutContent"

export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const [cookieStore, session] = await Promise.all([cookies(), auth()])
  const lang = cookieStore.get("lang")?.value === "en" ? "en" : "id"
  const role = (session?.user as { role?: string } | undefined)?.role ?? null
  const userName = session?.user?.name ?? null
  return (
    <LayoutContent initialLocale={lang} role={role} userName={userName}>
      {children}
    </LayoutContent>
  )
}
