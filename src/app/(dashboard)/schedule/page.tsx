import { auth } from "@/lib/auth";
import { redirect } from "next/navigation";
import { db } from "@/lib/db";
import Link from "next/link";
import {
  getSessionsForInstructor,
  getSessionsForStudent,
  getSessionsForStudents,
  getAllSessions,
} from "@/lib/schedule";
import { toSessionItem } from "@/components/schedule/types";
import ScheduleView from "@/components/schedule/ScheduleView";
import { getServerT, formatT } from "@/lib/i18n/serverT";

export default async function SchedulePage() {
  const t = await getServerT();
  const session = await auth();
  if (!session?.user) redirect("/login");

  const role = (session.user as any).role;
  const userId = (session.user as any).id;

  const windowStart = new Date();
  windowStart.setDate(windowStart.getDate() - 60);
  windowStart.setHours(0, 0, 0, 0);

  const labels = {
    title: t("dashboardSchedule.title"),
    manageSessions: t("dashboardSchedule.manageSessions"),
    setAvailability: t("dashboardSchedule.setAvailability"),
    linkedStudents: t("dashboardSchedule.linkedStudents"),
    adminDesc: t("dashboardSchedule.adminDesc"),
    instructorDesc: t("dashboardSchedule.instructorDesc"),
    studentDesc: t("dashboardSchedule.studentDesc"),
    guardianDesc: t("dashboardSchedule.guardianDesc"),
  };

  if (role === "ADMIN") {
    const [courses, sessions] = await Promise.all([
      db.course.findMany({
        where: { visibility: { not: "ARCHIVED" } },
        include: {
          instructor: { select: { id: true, name: true } },
          _count: { select: { sessions: true, enrollments: true } },
        },
        orderBy: { title: "asc" },
      }),
      getAllSessions({ from: windowStart, limit: 300 }),
    ]);
    return (
      <div>
        <div className="mb-6">
          <h1 className="metro-page-title">{labels.title}</h1>
          <p className="text-metro-text-secondary">{labels.adminDesc}</p>
        </div>

        <section className="mb-8">
          <h2 className="metro-section-title mb-3">
            {t("adminSchedule.courses")}
          </h2>
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {courses.map((c) => (
              <Link
                key={c.id}
                href={`/courses/${c.id}/manage/schedule`}
                className="metro-card"
              >
                <h3 className="font-medium text-metro-text">{c.title}</h3>
                <p className="text-sm text-metro-text-secondary mt-1">
                  {c.instructor.name} · {c._count.enrollments} · {c._count.sessions}
                </p>
              </Link>
            ))}
            {courses.length === 0 && (
              <p className="text-sm text-metro-text-secondary">
                {t("adminSchedule.noCourses")}
              </p>
            )}
          </div>
        </section>

        <section>
          <h2 className="metro-section-title mb-3">
            {t("adminSchedule.sessionsLast60Days")}
          </h2>
          <ScheduleView
            sessions={sessions.map((s) => toSessionItem(s))}
            showAttendees
            showInstructor
          />
        </section>
      </div>
    );
  }

  if (role === "GUARDIAN") {
    const links = await db.guardianStudent.findMany({
      where: { guardianId: userId },
      select: { studentId: true },
    });
    const studentIds = links.map((l) => l.studentId);
    const [sessions, students] = await Promise.all([
      getSessionsForStudents(studentIds, { from: windowStart }),
      db.user.findMany({
        where: { id: { in: studentIds } },
        select: { id: true, name: true },
      }),
    ]);
    return (
      <div>
        <h1 className="metro-page-title mb-2">{labels.title}</h1>
        <p className="text-metro-text-secondary mb-6">{labels.guardianDesc}</p>
        {students.length > 0 && (
          <div className="mb-6">
            <h2 className="metro-section-title mb-2">
              {labels.linkedStudents.toLowerCase()}
            </h2>
            <div className="flex gap-2">
              {students.map((s) => (
                <span
                  key={s.id}
                  className="bg-metro-blue-light text-metro-blue px-3 py-1 text-sm"
                >
                  {s.name}
                </span>
              ))}
            </div>
          </div>
        )}
        <ScheduleView
          sessions={sessions.map((s) => toSessionItem(s, studentIds))}
          showAttendees
          showInstructor
        />
      </div>
    );
  }

  if (role === "INSTRUCTOR") {
    const sessions = await getSessionsForInstructor(userId, {
      from: windowStart,
    });
    return (
      <div>
        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="metro-page-title">{labels.title}</h1>
            <p className="text-metro-text-secondary">{labels.instructorDesc}</p>
          </div>
          <a
            href="/schedule/availability"
            className="text-sm text-metro-blue hover:text-metro-chrome-dark font-medium"
          >
            {labels.setAvailability}
          </a>
        </div>
        <ScheduleView
          sessions={sessions.map((s) => toSessionItem(s))}
          showAttendees
        />
      </div>
    );
  }

  // Student
  const sessions = await getSessionsForStudent(userId, { from: windowStart });
  return (
    <div>
      <div className="mb-6">
        <h1 className="metro-page-title">{labels.title}</h1>
        <p className="text-metro-text-secondary">{labels.studentDesc}</p>
      </div>
      <ScheduleView
        sessions={sessions.map((s) => toSessionItem(s, [userId]))}
        showInstructor
      />
    </div>
  );
}
