import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import Link from "next/link";
import { redirect } from "next/navigation";
import CoursesClient from "./CoursesClient";
import BrowseCourses from "./BrowseCourses";

export default async function CoursesPage() {
  const session = await auth();
  if (!session?.user) redirect("/login");

  const userId = (session.user as any).id;
  const role = (session.user as any).role;

  let courses: any[] = [];
  let browseCourses: any[] = [];

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

    // Published courses the student is not enrolled in
    const enrolledCourseIds = enrollments.map((e) => e.courseId);
    const available = await db.course.findMany({
      where: {
        visibility: "PUBLISHED",
        id: { notIn: enrolledCourseIds },
      },
      include: {
        instructor: { select: { name: true } },
        _count: { select: { modules: true } },
      },
      orderBy: { createdAt: "desc" },
    });
    browseCourses = available.map((c) => ({
      id: c.id,
      title: c.title,
      description: c.description,
      enrollmentMode: c.enrollmentMode,
      instructorName: c.instructor.name,
      moduleCount: c._count.modules,
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
        <h2 className="mt-6 text-lg font-semibold text-gray-900">📚 My Courses</h2>
      )}

      <div className="mt-4">
        <CoursesClient courses={courses} role={role} />
      </div>

      {role === "STUDENT" && <BrowseCourses courses={browseCourses} />}
    </div>
  );
}
