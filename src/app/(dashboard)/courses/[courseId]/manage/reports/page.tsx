import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { canManageCourse } from "@/lib/coursePerms";
import Link from "next/link";
import { redirect, notFound } from "next/navigation";
import { getServerT, formatT } from "@/lib/i18n/serverT";
import ReportsManageClient from "./ReportsManageClient";

export default async function ManageReportsPage({
  params,
  searchParams,
}: {
  params: Promise<{ courseId: string }>;
  searchParams: Promise<{ student?: string }>;
}) {
  const t = await getServerT();
  const { courseId } = await params;
  const { student: studentParam } = await searchParams;
  const session = await auth();
  if (!session?.user) redirect("/login");

  const userId = session.user.id;
  const role = session.user.role;

  const course = await db.course.findUnique({
    where: { id: courseId },
    include: {
      enrollments: {
        include: { user: { select: { id: true, name: true } } },
        orderBy: { user: { name: "asc" } },
      },
      modules: {
        include: {
          lessons: { select: { id: true, title: true }, orderBy: { order: "asc" } },
        },
        orderBy: { order: "asc" },
      },
    },
  });
  if (!course) notFound();

  if (!(await canManageCourse(userId, role, course))) {
    redirect("/courses");
  }

  const reports = await db.studentReport.findMany({
    where: { courseId },
    include: {
      student: { select: { id: true, name: true } },
      author: { select: { id: true, name: true } },
      module: { select: { title: true } },
      lesson: { select: { title: true } },
    },
    orderBy: { createdAt: "desc" },
  });

  return (
    <div>
      <Link
        href={`/courses/${courseId}`}
        className="text-sm text-metro-text-secondary hover:text-metro-text"
      >
        {t("reports.back")}
      </Link>
      <h1 className="metro-page-title mt-2">
        {formatT(t("reports.manageTitle"), { title: course.title })}
      </h1>
      <p className="text-sm text-metro-text-secondary mt-1">
        {t("reports.manageDesc")}
      </p>

      <ReportsManageClient
        courseId={courseId}
        initialStudentId={
          course.enrollments.some((e) => e.userId === studentParam)
            ? studentParam!
            : ""
        }
        students={course.enrollments.map((e) => e.user)}
        modules={course.modules.map((m) => ({
          id: m.id,
          title: m.title,
          lessons: m.lessons,
        }))}
        reports={reports.map((r) => ({
          id: r.id,
          studentId: r.studentId,
          studentName: r.student.name,
          authorName: r.author.name,
          moduleTitle: r.module?.title ?? null,
          lessonTitle: r.lesson?.title ?? null,
          body: r.body,
          createdAt: r.createdAt.toISOString(),
        }))}
      />
    </div>
  );
}
