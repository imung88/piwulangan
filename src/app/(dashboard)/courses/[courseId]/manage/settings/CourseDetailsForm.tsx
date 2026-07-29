"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useT } from "@/lib/i18n/useT";
import { updateCourse } from "@/actions/courses";

export function CourseDetailsForm({
  courseId,
  initial,
}: {
  courseId: string;
  initial: {
    title: string;
    description: string;
    coverImageUrl: string;
    enrollmentMode: string;
  };
}) {
  const router = useRouter();
  const t = useT();
  const [title, setTitle] = useState(initial.title);
  const [description, setDescription] = useState(initial.description);
  const [coverImageUrl, setCoverImageUrl] = useState(initial.coverImageUrl);
  const [enrollmentMode, setEnrollmentMode] = useState(initial.enrollmentMode);
  const [loading, setLoading] = useState(false);
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setSaved(false);
    setError(null);
    const fd = new FormData();
    fd.set("title", title);
    fd.set("description", description);
    fd.set("coverImageUrl", coverImageUrl);
    fd.set("enrollmentMode", enrollmentMode);
    const res = await updateCourse(courseId, fd);
    setLoading(false);
    if (res && "error" in res && res.error) {
      const messages = Object.values(res.error)
        .flat()
        .filter(Boolean)
        .join(", ");
      setError(messages || t("settings.failedSave"));
      return;
    }
    setSaved(true);
    router.refresh();
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div>
        <label className="block text-sm font-medium text-metro-text">
          {t("settings.titleLbl")}
        </label>
        <input
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          required
          maxLength={120}
          className="metro-input mt-1 block w-full px-3 py-2 text-sm"
        />
      </div>
      <div>
        <label className="block text-sm font-medium text-metro-text">
          {t("settings.description")}
        </label>
        <textarea
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          rows={3}
          maxLength={2000}
          className="metro-input mt-1 block w-full px-3 py-2 text-sm"
        />
      </div>
      <div>
        <label className="block text-sm font-medium text-metro-text">
          {t("settings.coverImage")}
        </label>
        <input
          value={coverImageUrl}
          onChange={(e) => setCoverImageUrl(e.target.value)}
          type="url"
          placeholder="https://..."
          className="metro-input mt-1 block w-full px-3 py-2 text-sm"
        />
      </div>
      <div>
        <label className="block text-sm font-medium text-metro-text">
          {t("settings.enrollmentMode")}
        </label>
        <select
          value={enrollmentMode}
          onChange={(e) => setEnrollmentMode(e.target.value)}
          className="metro-input mt-1 block w-full px-3 py-2 text-sm"
        >
          <option value="OPEN">{t("settings.enrollmentOpen")}</option>
          <option value="INVITE_CODE">{t("settings.enrollmentInvite")}</option>
          <option value="MANUAL">{t("settings.enrollmentManual")}</option>
        </select>
      </div>
      <div className="flex items-center gap-3">
        <button
          type="submit"
          disabled={loading}
          className="bg-metro-blue px-4 py-2 text-sm font-medium text-white hover:bg-metro-blue-hover disabled:opacity-50"
        >
          {t("settings.saveChanges")}
        </button>
        {saved && <span className="text-sm text-metro-green">{t("settings.saved")}</span>}
        {error && <span className="text-sm text-metro-error">{error}</span>}
      </div>
    </form>
  );
}
