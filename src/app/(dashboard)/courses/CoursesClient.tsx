"use client"

import { useState } from "react"
import Link from "next/link"
import { useRouter } from "next/navigation"
import { useT } from "@/lib/i18n/useT"
import { format } from "@/lib/i18n/useT"
import { archiveCourse, unarchiveCourse } from "@/actions/courses"

type Course = {
  id: string;
  title: string;
  description: string | null;
  visibility: string;
  instructor?: { name: string } | null;
  _count?: { enrollments: number; modules: number };
  _progress?: number;
  _totalLessons?: number;
  _studentNames?: string[];
};

export default function CoursesClient({
  courses: initialCourses,
  role,
}: {
  courses: Course[];
  role: string;
}) {
  const router = useRouter()
  const t = useT()
  const [courses] = useState(initialCourses)
  const [showArchived, setShowArchived] = useState(false);
  const [message, setMessage] = useState<{ type: "success" | "error"; text: string } | null>(null);

  const activeCourses = courses.filter((c) => c.visibility !== "ARCHIVED");
  const archivedCourses = courses.filter((c) => c.visibility === "ARCHIVED");
  const displayCourses = showArchived ? archivedCourses : activeCourses;

  const handleArchive = async (courseId: string) => {
    const result = await archiveCourse(courseId);
    if (result?.error) {
      setMessage({ type: "error", text: result.error as string });
    } else {
      setMessage({ type: "success", text: "Course archived" });
      router.refresh();
    }
  };

  const handleUnarchive = async (courseId: string) => {
    const result = await unarchiveCourse(courseId);
    if (result?.error) {
      setMessage({ type: "error", text: result.error as string });
    } else {
      setMessage({ type: "success", text: "Course unarchived" });
      router.refresh();
    }
  };

  return (
    <div>
      {message && (
        <div
          className={`p-4 mb-4 ${
            message.type === "success" ? "bg-metro-green-light text-metro-green" : "bg-metro-error text-white"
          }`}
        >
          {message.text}
          <button
            onClick={() => setMessage(null)}
            className="ml-2 underline text-sm"
          >
            {t("courses.dismiss")}
          </button>
        </div>
      )}

      {role === "ADMIN" && archivedCourses.length > 0 && (
        <div className="mb-4">
          <button
            onClick={() => setShowArchived(!showArchived)}
            className="text-sm text-metro-blue hover:text-metro-blue-hover font-medium"
          >
            {showArchived
              ? `${t("courses.activeCourses")} (${activeCourses.length})`
              : `${t("courses.archivedCourses")} (${archivedCourses.length})`}
          </button>
        </div>
      )}

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {displayCourses.map((course: Course) => (
          <div
            key={course.id}
            className="metro-card hover:bg-metro-blue-light transition-colors"
          >
            <Link href={`/courses/${course.id}`}>
              <div className="flex items-start justify-between">
                <h2 className="font-semibold text-metro-text">{course.title}</h2>
                {course.visibility === "DRAFT" && (
                  <span className="metro-badge bg-metro-border text-metro-text-secondary">
                    Draft
                  </span>
                )}
                {course.visibility === "ARCHIVED" && (
                  <span className="metro-badge bg-metro-border text-metro-text-secondary">
                    {t("common.archived")}
                  </span>
                )}
              </div>
              {course.description && (
                <p className="mt-1 text-sm text-metro-text-secondary line-clamp-2">
                  {course.description}
                </p>
              )}
              <div className="mt-3 flex items-center gap-4 text-xs text-metro-text-secondary">
                {course.instructor && <span>👤 {course.instructor.name}</span>}
                {course._count && <span>📚 {format(t("courses.moduleCount"), { n: course._count.modules })}</span>}
                {course._count && <span>👥 {format(t("courses.studentCount"), { n: course._count.enrollments })}</span>}
              </div>
              {course._studentNames && course._studentNames.length > 0 && (
                <p className="mt-2 text-xs text-metro-blue">
                  🎓 {course._studentNames.join(", ")}
                </p>
              )}
            </Link>
            {role === "ADMIN" && (
              <div className="mt-3 pt-3 border-t border-metro-border">
                {course.visibility === "ARCHIVED" ? (
                  <button
                    onClick={() => handleUnarchive(course.id)}
                    className="text-sm text-metro-green hover:text-metro-green-hover font-medium"
                  >
                    {t("courses.unarchive")}
                  </button>
                ) : (
                <button
                  onClick={() => handleArchive(course.id)}
                    className="text-sm text-metro-text-secondary hover:text-metro-text font-medium"
                  >
                    {t("courses.archive")}
                  </button>
                )}
              </div>
            )}
            {role === "STUDENT" && course._totalLessons && course._totalLessons > 0 && (
              <div className="mt-3">
                <div className="flex items-center justify-between text-xs">
                  <span className="text-metro-text-secondary">
                    {course._progress}/{course._totalLessons} {t("student.lessons")}
                  </span>
                  <span className="font-medium">
                    {Math.round(((course._progress || 0) / course._totalLessons) * 100)}%
                  </span>
                </div>
                <div className="mt-1 h-1.5 bg-metro-border">
                  <div
                    className="h-1.5 bg-metro-green"
                    style={{
                      width: `${Math.round(((course._progress || 0) / course._totalLessons) * 100)}%`,
                    }}
                  />
                </div>
              </div>
            )}
          </div>
        ))}
      </div>

      {displayCourses.length === 0 && (
        <p className="mt-8 text-center text-metro-text-secondary">
          {role === "STUDENT"
            ? t("courses.noCoursesStudent")
            : role === "GUARDIAN"
            ? t("courses.noCoursesGuardian")
            : showArchived
            ? t("courses.noArchivedCourses")
            : t("courses.noCoursesAdmin")}
        </p>
      )}
    </div>
  );
}
