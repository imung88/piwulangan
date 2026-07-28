"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useT } from "@/lib/i18n/useT";
import { format } from "@/lib/i18n/useT";
import { unenrollSelf } from "@/actions/courses";

export default function UnenrollButton({
  courseId,
  courseTitle,
}: {
  courseId: string;
  courseTitle: string;
}) {
  const router = useRouter();
  const t = useT();
  const [loading, setLoading] = useState(false);

  async function handleUnenroll() {
    const msg = format(t("unenroll.confirm"), { title: courseTitle });
    if (!confirm(msg)) return;
    setLoading(true);
    await unenrollSelf(courseId);
    setLoading(false);
    router.push("/courses");
    router.refresh();
  }

  return (
    <button
      onClick={handleUnenroll}
      disabled={loading}
      className="text-sm text-metro-error hover:underline disabled:opacity-50"
    >
      {t("unenroll.leaveCourse")}
    </button>
  );
}
