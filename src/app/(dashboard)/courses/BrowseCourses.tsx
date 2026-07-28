"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import Link from "next/link"
import { useT } from "@/lib/i18n/useT"
import { format } from "@/lib/i18n/useT"
import { enrollOpen, enrollByCode } from "@/actions/courses"

interface BrowseCourse {
  id: string;
  title: string;
  description: string | null;
  enrollmentMode: string;
  instructorName: string;
  moduleCount: number;
}

export default function BrowseCourses({ courses }: { courses: BrowseCourse[] }) {
  const router = useRouter()
  const t = useT()
  const [busyId, setBusyId] = useState<string | null>(null)
  const [codeFor, setCodeFor] = useState<string | null>(null);
  const [code, setCode] = useState("");
  const [error, setError] = useState<string | null>(null);

  if (courses.length === 0) return null;

  async function handleEnrollOpen(courseId: string) {
    setBusyId(courseId);
    setError(null);
    const res = await enrollOpen(courseId);
    setBusyId(null);
    if (res?.error) {
      setError(res.error);
      return;
    }
    router.refresh();
  }

  async function handleEnrollCode(courseId: string) {
    if (!code.trim()) return;
    setBusyId(courseId);
    setError(null);
    const res = await enrollByCode(code.trim());
    setBusyId(null);
    if (res?.error) {
      setError(res.error);
      return;
    }
    setCodeFor(null);
    setCode("");
    router.refresh();
  }

  return (
    <section className="mt-10">
      <h2 className="metro-section-title mb-4">
        {t("browse.title")}
      </h2>
      {error && (
        <p className="mb-3 bg-metro-error px-3 py-2 text-sm text-white">
          {error}
        </p>
      )}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {courses.map((course) => (
          <div key={course.id} className="metro-card flex flex-col">
            <h3 className="font-medium text-metro-text">{course.title}</h3>
            <p className="text-xs text-metro-text-secondary mt-0.5">
              👤 {course.instructorName} · {format(t("courses.moduleCount"), { n: course.moduleCount })}
            </p>
            {course.description && (
              <p className="mt-2 text-sm text-metro-text-secondary line-clamp-2">
                {course.description}
              </p>
            )}
            <div className="mt-auto pt-3">
              {course.enrollmentMode === "OPEN" && (
                <button
                  onClick={() => handleEnrollOpen(course.id)}
                  disabled={busyId === course.id}
                  className="w-full bg-metro-green px-3 py-2 text-sm font-medium text-white hover:bg-metro-green-hover disabled:opacity-50"
                >
                  {t("browse.enroll")}
                </button>
              )}
              {course.enrollmentMode === "INVITE_CODE" &&
                (codeFor === course.id ? (
                  <div className="flex gap-2">
                    <input
                      value={code}
                      onChange={(e) => setCode(e.target.value)}
                      placeholder={t("browse.inviteCodePlaceholder")}
                      className="w-full metro-input px-2 py-1.5 text-sm"
                      autoFocus
                    />
                    <button
                      onClick={() => handleEnrollCode(course.id)}
                      disabled={busyId === course.id || !code.trim()}
                      className="bg-metro-green px-3 py-1.5 text-sm font-medium text-white hover:bg-metro-green-hover disabled:opacity-50"
                    >
                      {t("browse.join")}
                    </button>
                  </div>
                ) : (
                  <button
                    onClick={() => {
                      setCodeFor(course.id);
                      setCode("");
                    }}
                    className="w-full border border-metro-blue px-3 py-2 text-sm font-medium text-metro-blue hover:bg-metro-blue-light"
                  >
                    {t("browse.enterInviteCode")}
                  </button>
                ))}
              {course.enrollmentMode === "MANUAL" && (
                <p className="text-center text-xs text-metro-text-secondary py-2">
                  {t("browse.enrollmentByInstructor")}
                </p>
              )}
              <Link
                href={`/courses/${course.id}`}
                className="mt-2 block text-center text-xs text-metro-text-secondary hover:text-metro-text"
              >
                {t("browse.viewDetails")}
              </Link>
            </div>
          </div>
        ))}
      </div>
    </section>
  );
}
