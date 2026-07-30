"use client"

import { useEffect, useRef } from "react"

type Props = {
  open: boolean
  title: string
  message?: string
  confirmLabel: string
  cancelLabel: string
  danger?: boolean
  pending?: boolean
  onConfirm: () => void
  onCancel: () => void
}

export default function ConfirmDialog({
  open,
  title,
  message,
  confirmLabel,
  cancelLabel,
  danger = false,
  pending = false,
  onConfirm,
  onCancel,
}: Props) {
  const cancelRef = useRef<HTMLButtonElement>(null)

  useEffect(() => {
    if (!open) return
    cancelRef.current?.focus()
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onCancel()
    }
    document.addEventListener("keydown", onKey)
    return () => document.removeEventListener("keydown", onKey)
  }, [open, onCancel])

  if (!open) return null

  return (
    <div
      className="fixed inset-0 z-50 flex items-end justify-center bg-black/40 md:items-center"
      onClick={onCancel}
    >
      <div
        role="dialog"
        aria-modal="true"
        aria-label={title}
        className={`w-full bg-metro-surface p-5 md:max-w-md ${
          danger ? "border-t-4 border-metro-orange" : "border-t-4 border-metro-blue"
        }`}
        onClick={(e) => e.stopPropagation()}
      >
        <h2 className="text-lg font-semibold text-metro-text">{title}</h2>
        {message && (
          <p className="mt-2 text-sm leading-relaxed text-metro-text-secondary">{message}</p>
        )}
        <div className="mt-5 grid grid-cols-2 gap-3">
          <button
            ref={cancelRef}
            type="button"
            onClick={onCancel}
            disabled={pending}
            className="min-h-[48px] border-2 border-metro-border bg-metro-surface px-4 text-base font-bold text-metro-text transition-colors hover:bg-metro-bg disabled:cursor-not-allowed disabled:opacity-50"
          >
            {cancelLabel}
          </button>
          <button
            type="button"
            onClick={onConfirm}
            disabled={pending}
            className={`min-h-[48px] px-4 text-base font-bold text-white transition-colors disabled:cursor-not-allowed disabled:opacity-50 ${
              danger
                ? "bg-metro-orange hover:bg-metro-orange-hover"
                : "bg-metro-blue hover:bg-metro-blue-hover"
            }`}
          >
            {confirmLabel}
          </button>
        </div>
      </div>
    </div>
  )
}
