import { auth } from "@/lib/auth"
import { db } from "@/lib/db"
import Link from "next/link"
import { redirect } from "next/navigation"
import CoursesClient from "./CoursesClient"
import BrowseCourses from "./BrowseCourses"
import { getServerT } from "@/lib/i18n/serverT"

export default async function CoursesPage() {
  const t = await getServerT();
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
    const [enrollments, completedProgress] = await Promise.all([
      db.enrollment.findMany({
        where: { userId },
        include: {
          course: {
            include: {
              instructor: true,
              modules: { include: { lessons: true } },
            },
          },
        },
      }),
      db.progress.findMany({
        where: { userId, completed: true },
        select: { lessonId: true },
      }),
    ]);
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
  } else if (role === "GUARDIAN") {
    const links = await db.guardianStudent.findMany({
      where: { guardianId: userId },
      include: {
        student: {
          include: {
            enrollments: {
              include: {
                course: {
                  include: {
                    instructor: true,
                    _count: { select: { enrollments: true, modules: true } },
                  },
                },
              },
            },
          },
        },
      },
    });

    const byCourse = new Map<string, any>();
    for (const link of links) {
      for (const e of link.student.enrollments) {
        const existing = byCourse.get(e.courseId);
        if (existing) {
          existing._studentNames.push(link.student.name);
        } else {
          byCourse.set(e.courseId, {
            ...e.course,
            _studentNames: [link.student.name],
          });
        }
      }
    }
    courses = Array.from(byCourse.values());
  }

  // Server-side translations for page-header labels (already async function)
  const labels = {
    allCourses: t("courses.allCourses"),
    newCourse: t("courses.newCourse"),
    myCourses: t("courses.myCourses"),
    guardianDesc: t("courses.myCoursesGuardian"),
  }

  return (
    <div>
      <div className="flex items-center justify-between">
        <h1 className="metro-page-title">{labels.allCourses}</h1>
        {(role === "ADMIN" || role === "INSTRUCTOR") && (
          <Link
            href="/courses/new"
            className="bg-metro-green px-4 py-2 text-sm font-medium text-white hover:bg-metro-green-hover"
          >
            {labels.newCourse}
          </Link>
        )}
      </div>

      {role === "STUDENT" && (
        <h2 className="metro-section-title mt-6">{labels.myCourses}</h2>
      )}
      {role === "GUARDIAN" && (
        <p className="mt-2 text-sm text-metro-text-secondary">
          {labels.guardianDesc}
        </p>
      )}

      <div className="mt-4">
        <CoursesClient courses={courses} role={role} />
      </div>

      {role === "STUDENT" && <BrowseCourses courses={browseCourses} />}
    </div>
  );
}
