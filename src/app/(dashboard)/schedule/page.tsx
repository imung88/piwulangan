import { auth } from "@/lib/auth";
import { redirect } from "next/navigation";
import { db } from "@/lib/db";
import {
  getSessionsForInstructor,
  getSessionsForStudent,
  getSessionsForStudents,
  getAllSessions,
} from "@/lib/schedule";
import { toSessionItem } from "@/components/schedule/types";
import ScheduleView from "@/components/schedule/ScheduleView";
import { serverT, formatT } from "@/lib/i18n/serverT";

export default async function SchedulePage() {
  const session = await auth();
  if (!session?.user) redirect("/login");

  const role = (session.user as any).role;
  const userId = (session.user as any).id;

  const windowStart = new Date();
  windowStart.setDate(windowStart.getDate() - 60);
  windowStart.setHours(0, 0, 0, 0);

  const labels = {
    title: await serverT("dashboardSchedule.title"),
    manageSessions: await serverT("dashboardSchedule.manageSessions"),
    setAvailability: await serverT("dashboardSchedule.setAvailability"),
    linkedStudents: await serverT("dashboardSchedule.linkedStudents"),
    adminDesc: await serverT("dashboardSchedule.adminDesc"),
    instructorDesc: await serverT("dashboardSchedule.instructorDesc"),
    studentDesc: await serverT("dashboardSchedule.studentDesc"),
    guardianDesc: await serverT("dashboardSchedule.guardianDesc"),
  };

  if (role === "ADMIN") {
    const sessions = await getAllSessions({ from: windowStart, limit: 300 });
    return (
      <div>
        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="metro-page-title">{labels.title}</h1>
            <p className="text-metro-text-secondary">{labels.adminDesc}</p>
          </div>
          <a
            href="/admin/schedule"
            className="text-sm text-metro-blue hover:text-metro-chrome-dark font-medium"
          >
            {labels.manageSessions}
          </a>
        </div>
        <ScheduleView
          sessions={sessions.map((s) => toSessionItem(s))}
          showAttendees
          showInstructor
        />
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
