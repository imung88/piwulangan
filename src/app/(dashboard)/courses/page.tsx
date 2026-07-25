import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import Link from "next/link";
import { redirect } from "next/navigation";

export default async function CoursesPage() {
  const session = await auth();
  if (!session?.user) redirect("/login");

  const userId = (session.user as any).id;
  const role = (session.user as any).role;

  let courses: any[] = [];

  if (role === "ADMIN") {
    courses = await db.course.findMany({
      include: {
        instructor: true,
        _count: { select: { enrollments: true, modules: true } },
      },
      orderBy: { createdAt: "desc" },
    });
  } else if (role === "INSTRUCTOR") {
    courses = await db.course.findMany({
      where: { instructorId: userId },
      include: {
        _count: { select: { enrollments: true, modules: true } },
      },
      orderBy: { createdAt: "desc" },
    });
  } else if (role === "STUDENT") {
    const enrollments = await db.enrollment.findMany({
      where: { userId },
      include: {
        course: {
          include: {
            instructor: true,
            modules: { include: { lessons: true } },
            progress: { where: { userId, completed: true } },
          },
        },
      },
    });
    courses = enrollments.map((e) => ({
      ...e.course,
      _progress: e.course.progress.length,
      _totalLessons: e.course.modules.reduce((sum, m) => sum + m.lessons.length, 0),
    }));
  }

  return (
    <div>
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-gray-900">Courses</h1>
        {(role === "ADMIN" || role === "INSTRUCTOR") && (
          <Link
            href="/courses/new"
            className="rounded-md bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700"
          >
            + New Course
          </Link>
        )}
      </div>

      {role === "STUDENT" && (
        <div className="mt-4">
          <EnrollByCode />
        </div>
      )}

      <div className="mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {courses.map((course: any) => (
          <Link
            key={course.id}
            href={`/courses/${course.id}`}
            className="rounded-lg border bg-white p-4 hover:shadow-md transition-shadow"
          >
            <div className="flex items-start justify-between">
              <h2 className="font-semibold text-gray-900">{course.title}</h2>
              {course.visibility === "DRAFT" && (
                <span className="rounded-full bg-yellow-100 px-2 py-0.5 text-xs text-yellow-800">
                  Draft
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
            {role === "STUDENT" && course._totalLessons > 0 && (
              <div className="mt-3">
                <div className="flex items-center justify-between text-xs">
                  <span className="text-gray-500">
                    {course._progress}/{course._totalLessons} lessons
                  </span>
                  <span className="font-medium">
                    {Math.round((course._progress / course._totalLessons) * 100)}%
                  </span>
                </div>
                <div className="mt-1 h-1.5 rounded-full bg-gray-200">
                  <div
                    className="h-1.5 rounded-full bg-blue-600"
                    style={{
                      width: `${Math.round((course._progress / course._totalLessons) * 100)}%`,
                    }}
                  />
                </div>
              </div>
            )}
          </Link>
        ))}
      </div>

      {courses.length === 0 && (
        <p className="mt-8 text-center text-gray-500">
          {role === "STUDENT"
            ? "You're not enrolled in any courses yet. Enter an invite code above to join one."
            : "No courses yet. Create your first course!"}
        </p>
      )}
    </div>
  );
}

function EnrollByCode() {
  return (
    <form
      action={async (formData: FormData) => {
        "use server";
        const code = formData.get("code") as string;
        if (!code) return;
        const { enrollByCode } = await import("@/actions/courses");
        await enrollByCode(code);
      }}
      className="flex gap-2"
    >
      <input
        name="code"
        placeholder="Enter invite code"
        className="rounded-md border border-gray-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
      />
      <button
        type="submit"
        className="rounded-md bg-gray-100 px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-200"
      >
        Join Course
      </button>
    </form>
  );
}
