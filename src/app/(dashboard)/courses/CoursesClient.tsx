"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { archiveCourse, unarchiveCourse } from "@/actions/courses";

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
  const router = useRouter();
  const [courses] = useState(initialCourses);
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
            Dismiss
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
              ? `Show Active Courses (${activeCourses.length})`
              : `Show Archived Courses (${archivedCourses.length})`}
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
                    Archived
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
                {course._count && <span>📚 {course._count.modules} modules</span>}
                {course._count && <span>👥 {course._count.enrollments} students</span>}
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
                    Unarchive
                  </button>
                ) : (
                  <button
                    onClick={() => handleArchive(course.id)}
                    className="text-sm text-metro-text-secondary hover:text-metro-text font-medium"
                  >
                    Archive
                  </button>
                )}
              </div>
            )}
            {role === "STUDENT" && course._totalLessons && course._totalLessons > 0 && (
              <div className="mt-3">
                <div className="flex items-center justify-between text-xs">
                  <span className="text-metro-text-secondary">
                    {course._progress}/{course._totalLessons} lessons
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
            ? "You're not enrolled in any courses yet. Enter an invite code above to join one."
            : role === "GUARDIAN"
            ? "Your linked students are not enrolled in any courses yet."
            : showArchived
            ? "No archived courses"
            : "No courses yet. Create your first course!"}
        </p>
      )}
    </div>
  );
}
