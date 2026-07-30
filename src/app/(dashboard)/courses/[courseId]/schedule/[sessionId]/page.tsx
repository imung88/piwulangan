import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { canManageCourse } from "@/lib/coursePerms";
import { redirect, notFound } from "next/navigation";
import Link from "next/link";
import { getSessionById } from "@/lib/schedule";
import { toDateStr } from "@/components/schedule/types";
import { getServerT, formatT } from "@/lib/i18n/serverT";
import SessionDetailClient from "./SessionDetailClient";

export default async function SessionDetailPage({
  params,
}: {
  params: Promise<{ courseId: string; sessionId: string }>;
}) {
  const t = await getServerT();
  const { courseId, sessionId } = await params;
  const session = await auth();
  if (!session?.user) redirect("/login");

  const userId = (session.user as any).id;
  const role = (session.user as any).role;

  const [course, sessionRecord] = await Promise.all([
    db.course.findUnique({
      where: { id: courseId },
      include: {
        instructor: { select: { id: true, name: true } },
        enrollments: {
          include: { user: { select: { id: true, name: true, email: true } } },
        },
        modules: {
          include: { lessons: { orderBy: { order: "asc" } } },
          orderBy: { order: "asc" },
        },
      },
    }),
    getSessionById(sessionId),
  ]);

  if (!course || !sessionRecord || sessionRecord.courseId !== courseId) {
    notFound();
  }

  const canManage = await canManageCourse(userId, role, course);
  const isEnrolled = course.enrollments.some((e) => e.userId === userId);

  let guardianStudentIds: string[] = [];
  if (role === "GUARDIAN") {
    const links = await db.guardianStudent.findMany({
      where: {
        guardianId: userId,
        student: { enrollments: { some: { courseId } } },
      },
      select: { studentId: true },
    });
    guardianStudentIds = links.map((l) => l.studentId);
  }
  const isGuardianViewer = guardianStudentIds.length > 0;

  if (!canManage && !isEnrolled && !isGuardianViewer) {
    redirect(`/courses/${courseId}`);
  }

  const viewerStudentIds = canManage
    ? []
    : isGuardianViewer
      ? guardianStudentIds
      : [userId];

  const students = course.enrollments.map((e) => e.user);
  const lessons = course.modules.flatMap((m) =>
    m.lessons.map((l) => ({
      id: l.id,
      title: formatT(t("schedule.moduleLessonOption"), { order: m.order, title: l.title }),
    }))
  );

  const sessionData = {
    id: sessionRecord.id,
    title: sessionRecord.title,
    description: sessionRecord.description,
    date: toDateStr(sessionRecord.date),
    startTime: sessionRecord.startTime,
    endTime: sessionRecord.endTime,
    location: sessionRecord.location,
    status: sessionRecord.status,
    cancelReason: sessionRecord.cancelReason,
    lessonId: sessionRecord.lesson?.id ?? null,
    lessonTitle: sessionRecord.lesson?.title ?? null,
    instructorName: sessionRecord.instructor.name,
    attendees: sessionRecord.attendees.map((a) => ({
      studentId: a.studentId,
      name: a.student.name,
      email: a.student.email,
      attendance: a.attendance,
      notes: a.notes,
    })),
  };

  return (
    <div>
      <div className="mb-6">
        <Link
          href={`/courses/${courseId}/schedule`}
          className="text-sm text-metro-text-secondary hover:text-metro-text"
        >
          {t("sessionDetail.back")}
        </Link>
        <h1 className="metro-page-title mt-1">
          {formatT(t("sessionDetail.title"), { title: course.title })}
        </h1>
      </div>

      <SessionDetailClient
        courseId={courseId}
        session={sessionData}
        canManage={canManage}
        students={students}
        lessons={lessons}
        viewerStudentIds={viewerStudentIds}
      />
    </div>
  );
}
