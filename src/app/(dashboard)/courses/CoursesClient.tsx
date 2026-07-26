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
          className={`rounded-lg p-4 mb-4 ${
            message.type === "success" ? "bg-green-50 text-green-800" : "bg-red-50 text-red-800"
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
            className="text-sm text-blue-600 hover:text-blue-800 font-medium"
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
            className="rounded-lg border bg-white p-4 hover:shadow-md transition-shadow"
          >
            <Link href={`/courses/${course.id}`}>
              <div className="flex items-start justify-between">
                <h2 className="font-semibold text-gray-900">{course.title}</h2>
                {course.visibility === "DRAFT" && (
                  <span className="rounded-full bg-yellow-100 px-2 py-0.5 text-xs text-yellow-800">
                    Draft
                  </span>
                )}
                {course.visibility === "ARCHIVED" && (
                  <span className="rounded-full bg-gray-100 px-2 py-0.5 text-xs text-gray-800">
                    Archived
                  </span>
                )}
              </div>
              {course.description && (
                <p className="mt-1 text-sm text-gray-500 line-clamp-2">
                  {course.description}
                </p>
              )}
              <div className="mt-3 flex items-center gap-4 text-xs text-gray-400">
                {course.instructor && <span>👤 {course.instructor.name}</span>}
                {course._count && <span>📚 {course._count.modules} modules</span>}
                {course._count && <span>👥 {course._count.enrollments} students</span>}
              </div>
              {course._studentNames && course._studentNames.length > 0 && (
                <p className="mt-2 text-xs text-purple-600">
                  🎓 {course._studentNames.join(", ")}
                </p>
              )}
            </Link>
            {role === "ADMIN" && (
              <div className="mt-3 pt-3 border-t">
                {course.visibility === "ARCHIVED" ? (
                  <button
                    onClick={() => handleUnarchive(course.id)}
                    className="text-sm text-green-600 hover:text-green-800 font-medium"
                  >
                    Unarchive
                  </button>
                ) : (
                  <button
                    onClick={() => handleArchive(course.id)}
                    className="text-sm text-gray-600 hover:text-gray-800 font-medium"
                  >
                    Archive
                  </button>
                )}
              </div>
            )}
            {role === "STUDENT" && course._totalLessons && course._totalLessons > 0 && (
              <div className="mt-3">
                <div className="flex items-center justify-between text-xs">
                  <span className="text-gray-500">
                    {course._progress}/{course._totalLessons} lessons
                  </span>
                  <span className="font-medium">
                    {Math.round(((course._progress || 0) / course._totalLessons) * 100)}%
                  </span>
                </div>
                <div className="mt-1 h-1.5 rounded-full bg-gray-200">
                  <div
                    className="h-1.5 rounded-full bg-blue-600"
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
        <p className="mt-8 text-center text-gray-500">
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
