"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import Link from "next/link"
import { useT } from "@/lib/i18n/useT"
import { createCourse } from "@/actions/courses"

interface InstructorOption {
  id: string
  name: string
  email: string | null
}

export default function NewCourseForm({
  instructors,
}: {
  instructors: InstructorOption[]
}) {
  const router = useRouter()
  const t = useT()
  const [errors, setErrors] = useState<Record<string, string[]>>({})
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setErrors({});
    setLoading(true);

    const formData = new FormData(e.currentTarget);
    const result = await createCourse(formData);

    if (result?.error) {
      setErrors(result.error as Record<string, string[]>);
      setLoading(false);
    } else if (result?.success) {
      router.push(`/courses/${result.courseId}/manage/content`);
    }
  }

  return (
    <div className="max-w-lg">
      <Link href="/courses" className="text-sm text-metro-text-secondary hover:text-metro-text">
        {t("newCourse.back")}
      </Link>
      <h1 className="metro-page-title mt-2">{t("newCourse.title")}</h1>

      <form onSubmit={handleSubmit} className="mt-6 space-y-4">
        <div>
          <label htmlFor="title" className="block text-sm font-medium text-metro-text">
            {t("newCourse.courseTitle")}
          </label>
          <input
            id="title"
            name="title"
            required
            maxLength={120}
            placeholder={t("newCourse.courseTitlePlaceholder")}
            className="metro-input mt-1 block w-full px-3 py-2"
          />
          {errors.title && <p className="mt-1 text-sm text-metro-error">{errors.title[0]}</p>}
        </div>

        <div>
          <label htmlFor="description" className="block text-sm font-medium text-metro-text">
            {t("newCourse.description")}
          </label>
          <textarea
            id="description"
            name="description"
            rows={3}
            maxLength={2000}
            placeholder={t("newCourse.descriptionPlaceholder")}
            className="metro-input mt-1 block w-full px-3 py-2"
          />
        </div>

        <div>
          <label htmlFor="coverImageUrl" className="block text-sm font-medium text-metro-text">
            {t("newCourse.coverImage")}
          </label>
          <input
            id="coverImageUrl"
            name="coverImageUrl"
            type="url"
            placeholder={t("newCourse.coverImagePlaceholder")}
            className="metro-input mt-1 block w-full px-3 py-2"
          />
        </div>

        <div>
          <label htmlFor="enrollmentMode" className="block text-sm font-medium text-metro-text">
            {t("newCourse.enrollmentMode")}
          </label>
          <select
            id="enrollmentMode"
            name="enrollmentMode"
            defaultValue="INVITE_CODE"
            className="metro-input mt-1 block w-full px-3 py-2"
          >
            <option value="OPEN">{t("newCourse.enrollmentOpen")}</option>
            <option value="INVITE_CODE">{t("newCourse.enrollmentInviteCode")}</option>
            <option value="MANUAL">{t("newCourse.enrollmentManual")}</option>
          </select>
        </div>

        {instructors.length > 0 && (
          <div>
            <label htmlFor="instructorId" className="block text-sm font-medium text-metro-text">
              {t("newCourse.instructor")}
            </label>
            <select
              id="instructorId"
              name="instructorId"
              defaultValue=""
              className="metro-input mt-1 block w-full px-3 py-2"
            >
              <option value="">{t("newCourse.instructorSelf")}</option>
              {instructors.map((i) => (
                <option key={i.id} value={i.id}>
                  {i.name} ({i.email})
                </option>
              ))}
            </select>
            {errors.instructorId && (
              <p className="mt-1 text-sm text-metro-error">{errors.instructorId[0]}</p>
            )}
          </div>
        )}

        <button
          type="submit"
          disabled={loading}
          className="metro-btn disabled:opacity-50"
        >
          {loading ? t("newCourse.creating") : t("newCourse.create")}
        </button>
      </form>
    </div>
  );
}
