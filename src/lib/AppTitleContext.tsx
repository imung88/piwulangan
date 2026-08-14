/**
 * @module lib/AppTitleContext
 * @overview React context provider for managing application title across the UI.
 * @responsibilities
 *   - Provide dynamic app title state to client components
 * @exports
 *   - `useAppTitle`: Hook to retrieve current app title
 *   - `default`: AppTitleProvider component wrapper
 */
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
