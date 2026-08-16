"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { useT, format } from "@/lib/i18n/useT"
import ConfirmDialog from "@/components/ui/ConfirmDialog"
import { useToast } from "@/components/ui/Toast"
import { publishCourse } from "@/actions/courses"

export default function PublishCourseButton({
  courseId,
  title,
  className,
}: {
  courseId: string;
  title: string;
  className?: string;
}) {
  const router = useRouter()
  const t = useT()
  const toast = useToast()
  const [confirming, setConfirming] = useState(false)
  const [pending, setPending] = useState(false)

  const handlePublish = async () => {
    setPending(true)
    const res = await publishCourse(courseId)
    setPending(false)
    if (!res.success) {
      toast.error(res.error)
      return
    }
    toast.success(t("courses.coursePublished"))
    setConfirming(false)
    router.refresh()
  }

  return (
    <>
      <button
        onClick={() => setConfirming(true)}
        className={
          className ??
          "min-h-[44px] bg-metro-green px-4 text-sm font-medium text-white hover:bg-metro-green-hover"
        }
      >
        {t("courses.publish")}
      </button>
      <ConfirmDialog
        open={confirming}
        pending={pending}
        title={format(t("courses.confirmPublish"), { title })}
        message={t("courses.publishInfo")}
        confirmLabel={t("courses.publish")}
        cancelLabel={t("common.cancel")}
        onConfirm={handlePublish}
        onCancel={() => setConfirming(false)}
      />
    </>
  )
}
