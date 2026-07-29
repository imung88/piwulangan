import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import Link from "next/link";
import { redirect, notFound } from "next/navigation";
import { getSessionsForCourse } from "@/lib/schedule";
import ManageScheduleClient from "./ManageScheduleClient";
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

  const userId = (session.user as any).id;
  const role = (session.user as any).role;

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

  if (role !== "ADMIN" && course.instructorId !== userId) {
    redirect(`/courses/${course.id}`);
  }

  const sessions = await getSessionsForCourse(course.id);

  const students = course.enrollments.map((e) => e.user);
  const lessons = course.modules.flatMap((m) =>
    m.lessons.map((l) => ({
      id: l.id,
      title: `Module ${m.order}: ${l.title}`,
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
          date: s.date.toISOString().split("T")[0],
          startTime: s.startTime,
          endTime: s.endTime,
          location: s.location,
          status: s.status,
          cancelReason: s.cancelReason,
          lessonId: s.lesson?.id ?? null,
          lessonTitle: s.lesson?.title ?? null,
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
