"use client"

import LayoutContent from "./LayoutContent"

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return <LayoutContent>{children}</LayoutContent>
}
