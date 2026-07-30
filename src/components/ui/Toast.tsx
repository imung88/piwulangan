"use client"

import { createContext, useCallback, useContext, useMemo, useRef, useState } from "react"

type ToastType = "success" | "error" | "info"
type ToastItem = { id: number; type: ToastType; message: string }

type ToastApi = {
  success: (message: string) => void
  error: (message: string) => void
  info: (message: string) => void
}

const noop = () => {}
const Ctx = createContext<ToastApi>({ success: noop, error: noop, info: noop })

export function useToast(): ToastApi {
  return useContext(Ctx)
}

const STYLES: Record<ToastType, string> = {
  success: "bg-metro-green",
  error: "bg-metro-orange",
  info: "bg-metro-chrome-dark",
}

const ICONS: Record<ToastType, string> = {
  success: "✓",
  error: "✕",
  info: "i",
}

export default function ToastProvider({ children }: { children: React.ReactNode }) {
  const [toasts, setToasts] = useState<ToastItem[]>([])
  const nextId = useRef(1)

  const dismiss = useCallback((id: number) => {
    setToasts((prev) => prev.filter((t) => t.id !== id))
  }, [])

  const push = useCallback(
    (type: ToastType, message: string) => {
      const id = nextId.current++
      setToasts((prev) => [...prev.slice(-2), { id, type, message }])
      setTimeout(() => dismiss(id), 4000)
    },
    [dismiss],
  )

  const api = useMemo<ToastApi>(
    () => ({
      success: (m) => push("success", m),
      error: (m) => push("error", m),
      info: (m) => push("info", m),
    }),
    [push],
  )

  return (
    <Ctx.Provider value={api}>
      {children}
      <div
        aria-live="polite"
        className="pointer-events-none fixed inset-x-4 bottom-24 z-50 flex flex-col items-center gap-2 md:inset-x-auto md:bottom-6 md:right-6 md:items-end"
      >
        {toasts.map((toast) => (
          <button
            key={toast.id}
            type="button"
            onClick={() => dismiss(toast.id)}
            className={`pointer-events-auto flex w-full max-w-md items-center gap-3 px-4 py-3 text-left text-sm font-semibold text-white shadow-lg ${STYLES[toast.type]}`}
          >
            <span aria-hidden="true" className="flex h-6 w-6 shrink-0 items-center justify-center border-2 border-white text-xs font-bold">
              {ICONS[toast.type]}
            </span>
            {toast.message}
          </button>
        ))}
      </div>
    </Ctx.Provider>
  )
}
