"use client"

import { useRef, useState } from "react"
import { useT } from "@/lib/i18n/useT"

export default function CopyInviteCode({ code }: { code: string }) {
  const t = useT()
  const [copied, setCopied] = useState(false)
  const timeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  async function handleCopy() {
    try {
      await navigator.clipboard.writeText(code)
      setCopied(true)
      if (timeoutRef.current) clearTimeout(timeoutRef.current)
      timeoutRef.current = setTimeout(() => setCopied(false), 2000)
    } catch {
      // clipboard unavailable (e.g. insecure context) — do nothing
    }
  }

  return (
    <button
      onClick={handleCopy}
      className="text-sm text-metro-text-secondary hover:text-metro-blue"
      title={t("common.copy")}
    >
      🔑 {t("courseDetail.code")}: <span className="font-mono">{code}</span>
      {copied ? (
        <span className="ml-1.5 font-medium text-metro-green">{t("common.copied")}</span>
      ) : (
        <span className="ml-1.5">📋</span>
      )}
    </button>
  )
}
