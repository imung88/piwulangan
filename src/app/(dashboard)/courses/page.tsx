import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import Link from "next/link";
import { redirect } from "next/navigation";
import CoursesClient from "./CoursesClient";

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
          },
        },
      },
    });

    // Get completed lesson IDs for this user
    const completedProgress = await db.progress.findMany({
      where: { userId, completed: true },
      select: { lessonId: true },
    });
    const completedLessonIds = new Set(completedProgress.map((p) => p.lessonId));

    courses = enrollments.map((e) => {
      const totalLessons = e.course.modules.reduce(
        (sum: number, m: any) => sum + m.lessons.length,
        0
      );
      const completedLessons = e.course.modules.reduce(
        (sum: number, m: any) =>
          sum + m.lessons.filter((l: any) => completedLessonIds.has(l.id)).length,
        0
      );
      return {
        ...e.course,
        _progress: completedLessons,
        _totalLessons: totalLessons,
      };
    });
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

      <div className="mt-6">
        <CoursesClient courses={courses} role={role} />
      </div>
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
