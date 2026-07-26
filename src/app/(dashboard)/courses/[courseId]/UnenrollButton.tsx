"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { unenrollSelf } from "@/actions/courses";

export default function UnenrollButton({
  courseId,
  courseTitle,
}: {
  courseId: string;
  courseTitle: string;
}) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);

  async function handleUnenroll() {
    if (
      !confirm(
        `Leave "${courseTitle}"? Your progress will be kept, but you will lose access to the course.`
      )
    )
      return;
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
      className="text-sm text-red-600 hover:text-red-700 disabled:opacity-50"
    >
      Leave course
    </button>
  );
}
