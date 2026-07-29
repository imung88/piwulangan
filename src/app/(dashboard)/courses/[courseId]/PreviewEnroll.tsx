"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useT } from "@/lib/i18n/useT";
import { enrollOpen, enrollByCode } from "@/actions/courses";

export function PreviewEnroll({
  courseId,
  enrollmentMode,
}: {
  courseId: string;
  enrollmentMode: string;
}) {
  const router = useRouter();
  const t = useT();
  const [code, setCode] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleEnrollOpen() {
    setLoading(true);
    setError(null);
    const res = await enrollOpen(courseId);
    setLoading(false);
    if (res?.error) {
      setError(res.error);
      return;
    }
    router.refresh();
  }

  async function handleEnrollCode(e: React.FormEvent) {
    e.preventDefault();
    if (!code.trim()) return;
    setLoading(true);
    setError(null);
    const res = await enrollByCode(code.trim());
    setLoading(false);
    if (res?.error) {
      setError(res.error);
      return;
    }
    router.refresh();
  }

  if (enrollmentMode === "OPEN") {
    return (
      <div>
        <p className="mb-3 text-sm text-metro-text-secondary">
          {t("courseDetail.previewOpen")}
        </p>
        <button
          onClick={handleEnrollOpen}
          disabled={loading}
          className="bg-metro-green px-6 py-2 text-sm font-medium text-white hover:bg-metro-green-hover disabled:opacity-50"
        >
          {t("courseDetail.enrollNow")}
        </button>
        {error && <p className="mt-3 text-sm text-metro-error">{error}</p>}
      </div>
    );
  }

  if (enrollmentMode === "INVITE_CODE") {
    return (
      <div>
        <form onSubmit={handleEnrollCode} className="flex justify-center gap-2">
          <input
            value={code}
            onChange={(e) => setCode(e.target.value)}
            placeholder={t("courseDetail.previewInvitePlaceholder")}
            className="metro-input px-3 py-2 text-sm"
          />
          <button
            type="submit"
            disabled={loading || !code.trim()}
            className="bg-metro-green px-4 py-2 text-sm font-medium text-white hover:bg-metro-green-hover disabled:opacity-50"
          >
            {t("courseDetail.previewInvite")}
          </button>
        </form>
        {error && <p className="mt-3 text-sm text-metro-error">{error}</p>}
      </div>
    );
  }

  return (
    <p className="text-sm text-metro-text-secondary">
      {t("courseDetail.previewManaged")}
    </p>
  );
}
