import { auth } from "@/lib/auth";
import { redirect } from "next/navigation";
import { db } from "@/lib/db";
import Link from "next/link";
import { getAllSessions } from "@/lib/schedule";
import { toSessionItem } from "@/components/schedule/types";
import ScheduleView from "@/components/schedule/ScheduleView";

export default async function AdminSchedulePage() {
  const session = await auth();
  if (!session?.user) redirect("/login");

  const role = (session.user as any).role;
  if (role !== "ADMIN") redirect("/dashboard");

  const windowStart = new Date();
  windowStart.setDate(windowStart.getDate() - 60);
  windowStart.setHours(0, 0, 0, 0);

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
        <h1 className="text-2xl font-bold text-gray-900">
          Schedule Management
        </h1>
        <p className="text-gray-600">
          Sessions are managed per course. Open a course to create, edit, or
          cancel sessions.
        </p>
      </div>

      <section className="mb-8">
        <h2 className="text-lg font-semibold text-gray-900 mb-3">Courses</h2>
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {courses.map((c) => (
            <Link
              key={c.id}
              href={`/courses/${c.id}/manage/schedule`}
              className="rounded-lg border bg-white p-4 hover:shadow-md transition-shadow"
            >
              <h3 className="font-medium text-gray-900">{c.title}</h3>
              <p className="text-sm text-gray-500 mt-1">
                {c.instructor.name} · {c._count.enrollments} students ·{" "}
                {c._count.sessions} sessions
              </p>
            </Link>
          ))}
          {courses.length === 0 && (
            <p className="text-sm text-gray-500">No courses.</p>
          )}
        </div>
      </section>

      <section>
        <h2 className="text-lg font-semibold text-gray-900 mb-3">
          All Sessions (last 60 days onward)
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
