"use client"
import { createContext, useContext } from "react"

const Ctx = createContext<string>("Piwulangan")

export function useAppTitle(): string {
  return useContext(Ctx)
}

export default function AppTitleProvider({
  title,
  children,
}: {
  title: string
  children: React.ReactNode
}) {
  return <Ctx.Provider value={title}>{children}</Ctx.Provider>
}
