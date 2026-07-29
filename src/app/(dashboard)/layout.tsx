import { cookies } from "next/headers"
import LayoutContent from "./LayoutContent"

export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const lang = (await cookies()).get("lang")?.value === "en" ? "en" : "id"
  return <LayoutContent initialLocale={lang}>{children}</LayoutContent>
}
