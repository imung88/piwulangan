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

export default async function SchedulePage() {
  const session = await auth();
  if (!session?.user) redirect("/login");

  const role = (session.user as any).role;
  const userId = (session.user as any).id;

  const windowStart = new Date();
  windowStart.setDate(windowStart.getDate() - 60);
  windowStart.setHours(0, 0, 0, 0);

  if (role === "ADMIN") {
    const sessions = await getAllSessions({ from: windowStart, limit: 300 });
    return (
      <div>
        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Schedule</h1>
            <p className="text-gray-600">
              All sessions across all courses (last 60 days onward).
            </p>
          </div>
          <a
            href="/admin/schedule"
            className="text-sm text-blue-600 hover:text-blue-700 font-medium"
          >
            Manage Sessions
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
        <h1 className="text-2xl font-bold text-gray-900 mb-2">Schedule</h1>
        <p className="text-gray-600 mb-6">
          View your linked students&apos; sessions.
        </p>

        {students.length > 0 && (
          <div className="mb-6">
            <h2 className="text-sm font-medium text-gray-500 uppercase tracking-wide mb-2">
              Linked Students
            </h2>
            <div className="flex gap-2">
              {students.map((s) => (
                <span
                  key={s.id}
                  className="bg-purple-100 text-purple-700 px-3 py-1 rounded-full text-sm"
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
            <h1 className="text-2xl font-bold text-gray-900">Schedule</h1>
            <p className="text-gray-600">Sessions you teach.</p>
          </div>
          <a
            href="/schedule/availability"
            className="text-sm text-blue-600 hover:text-blue-700 font-medium"
          >
            Set Availability
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
        <h1 className="text-2xl font-bold text-gray-900">Schedule</h1>
        <p className="text-gray-600">
          Your sessions across all courses. Sessions are scheduled by your
          instructors — check each course&apos;s Schedule tab for details.
        </p>
      </div>
      <ScheduleView
        sessions={sessions.map((s) => toSessionItem(s, [userId]))}
        showInstructor
      />
    </div>
  );
}
