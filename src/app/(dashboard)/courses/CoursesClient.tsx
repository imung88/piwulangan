"use client"

import { useState } from "react"
import Link from "next/link"
import { useRouter } from "next/navigation"
import { useT } from "@/lib/i18n/useT"
import { format } from "@/lib/i18n/useT"
import ConfirmDialog from "@/components/ui/ConfirmDialog"
import { useToast } from "@/components/ui/Toast"
import { archiveCourse, unarchiveCourse, unpublishCourse } from "@/actions/courses"
import PublishCourseButton from "@/components/PublishCourseButton"

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
  courses,
  role,
}: {
  courses: Course[];
  role: string;
}) {
  const router = useRouter()
  const t = useT()
  const toast = useToast()
  const [showArchived, setShowArchived] = useState(false);
  const [archiving, setArchiving] = useState<Course | null>(null);
  const [archivePending, setArchivePending] = useState(false);
  const [unpublishing, setUnpublishing] = useState<Course | null>(null);
  const [unpublishPending, setUnpublishPending] = useState(false);

  const activeCourses = courses.filter((c) => c.visibility !== "ARCHIVED");
  const archivedCourses = courses.filter((c) => c.visibility === "ARCHIVED");
  const displayCourses = showArchived ? archivedCourses : activeCourses;

  const handleArchive = async () => {
    if (!archiving) return;
    setArchivePending(true);
    const result = await archiveCourse(archiving.id);
    setArchivePending(false);
    setArchiving(null);
    if (result?.error) {
      toast.error(result.error as string);
    } else {
      toast.success(t("courses.courseArchived"));
      router.refresh();
    }
  };

  const handleUnpublish = async () => {
    if (!unpublishing) return;
    setUnpublishPending(true);
    try {
      await unpublishCourse(unpublishing.id);
      toast.success(t("courses.courseUnpublished"));
      setUnpublishing(null);
      router.refresh();
    } catch {
      toast.error(t("settings.failedTeacherAction"));
    } finally {
      setUnpublishPending(false);
    }
  };

  const handleUnarchive = async (courseId: string) => {
    const result = await unarchiveCourse(courseId);
    if (result?.error) {
      toast.error(result.error as string);
    } else {
      toast.success(t("courses.courseUnarchived"));
      router.refresh();
    }
  };

  return (
    <div>

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
                    {t("common.draft")}
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
            {(role === "ADMIN" || (role === "INSTRUCTOR" && course.visibility !== "ARCHIVED")) && (
              <div className="mt-3 pt-3 border-t border-metro-border flex items-center gap-4">
                {course.visibility === "DRAFT" && (
                  <PublishCourseButton courseId={course.id} title={course.title} />
                )}
                {course.visibility === "PUBLISHED" && (
                  <button
                    onClick={() => setUnpublishing(course)}
                    className="min-h-[44px] border-2 border-metro-border bg-metro-surface px-4 text-sm font-medium text-metro-text hover:bg-metro-bg"
                  >
                    {t("common.draft")}
                  </button>
                )}
                {role === "ADMIN" &&
                  (course.visibility === "ARCHIVED" ? (
                    <button
                      onClick={() => handleUnarchive(course.id)}
                      className="min-h-[44px] bg-metro-green px-4 text-sm font-medium text-white hover:bg-metro-green-hover"
                    >
                      {t("courses.unarchive")}
                    </button>
                  ) : (
                    <button
                      onClick={() => setArchiving(course)}
                      className="min-h-[44px] border-2 border-metro-border bg-metro-surface px-4 text-sm font-medium text-metro-text hover:bg-metro-bg"
                    >
                      {t("courses.archive")}
                    </button>
                  ))}
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

      <ConfirmDialog
        open={unpublishing !== null}
        pending={unpublishPending}
        title={format(t("courses.confirmUnpublish"), { title: unpublishing?.title ?? "" })}
        message={t("courses.unpublishInfo")}
        confirmLabel={t("common.draft")}
        cancelLabel={t("common.cancel")}
        onConfirm={handleUnpublish}
        onCancel={() => setUnpublishing(null)}
      />

      <ConfirmDialog
        open={archiving !== null}
        pending={archivePending}
        title={format(t("courses.confirmArchive"), { title: archiving?.title ?? "" })}
        message={t("courses.archiveWarn")}
        confirmLabel={t("courses.archive")}
        cancelLabel={t("common.cancel")}
        onConfirm={handleArchive}
        onCancel={() => setArchiving(null)}
      />
    </div>
  );
}
