import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { canManageCourse } from "@/lib/coursePerms";
import Link from "next/link";
import { redirect, notFound } from "next/navigation";
import ManageScheduleClient from "./ManageScheduleClient";
import { toDateStr } from "@/components/schedule/types";
import { getServerT, formatT } from "@/lib/i18n/serverT";

export default async function ManageSchedulePage({
  params,
}: {
  params: Promise<{ courseId: string }>;
}) {
  const t = await getServerT();
  const { courseId } = await params;
  const session = await auth();
  if (!session?.user) redirect("/login");

  const userId = session.user.id;
  const role = session.user.role;

  const course = await db.course.findUnique({
    where: { id: courseId },
    include: {
      modules: {
        include: { lessons: { orderBy: { order: "asc" } } },
        orderBy: { order: "asc" },
      },
      enrollments: {
        include: { user: { select: { id: true, name: true, email: true } } },
      },
    },
  });
  if (!course) notFound();

  if (!(await canManageCourse(userId, role, course))) {
    redirect(`/courses/${course.id}`);
  }

  // Fetch sessions with series info
  const sessions = await db.classSession.findMany({
    where: { courseId: course.id },
    include: {
      course: { select: { id: true, title: true } },
      instructor: { select: { id: true, name: true } },
      lesson: { select: { id: true, title: true, moduleId: true } },
      attendees: {
        include: { student: { select: { id: true, name: true, email: true } } },
      },
    },
    orderBy: [{ date: "asc" }, { startTime: "asc" }],
  });

  const students = course.enrollments.map((e) => e.user);
  const lessons = course.modules.flatMap((m) =>
    m.lessons.map((l) => ({
      id: l.id,
      title: formatT(t("schedule.moduleLessonOption"), { order: m.order, title: l.title }),
    }))
  );

  const labels = {
    back: t("schedule.back"),
    manageTitle: t("schedule.manageSessions"),
    manageDesc: t("schedule.manageDesc"),
  };

  return (
    <div>
      <div className="mb-6">
        <Link
          href={`/courses/${course.id}/schedule`}
          className="text-sm text-metro-text-secondary hover:text-metro-text"
        >
          {labels.back}
        </Link>
        <h1 className="metro-page-title mt-1">
          {formatT(labels.manageTitle, { title: course.title })}
        </h1>
        <p className="text-metro-text-secondary">
          {labels.manageDesc}
        </p>
      </div>

      <ManageScheduleClient
        courseId={course.id}
        students={students}
        lessons={lessons}
        sessions={sessions.map((s) => ({
          id: s.id,
          title: s.title,
          description: s.description,
          date: toDateStr(s.date),
          startTime: s.startTime,
          endTime: s.endTime,
          location: s.location,
          status: s.status,
          cancelReason: s.cancelReason,
          lessonId: s.lesson?.id ?? null,
          lessonTitle: s.lesson?.title ?? null,
          seriesId: s.seriesId,
          seriesWeek: s.seriesWeek,
          attendees: s.attendees.map((a) => ({
            studentId: a.studentId,
            name: a.student.name,
            attendance: a.attendance,
            notes: a.notes,
          })),
        }))}
      />
    </div>
  );
}
