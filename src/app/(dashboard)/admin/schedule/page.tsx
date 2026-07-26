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
        <h1 className="metro-page-title">
          Schedule Management
        </h1>
        <p className="text-metro-text-secondary">
          Sessions are managed per course. Open a course to create, edit, or
          cancel sessions.
        </p>
      </div>

      <section className="mb-8">
        <h2 className="metro-section-title mb-3">courses</h2>
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {courses.map((c) => (
            <Link
              key={c.id}
              href={`/courses/${c.id}/manage/schedule`}
              className="metro-card"
            >
              <h3 className="font-medium text-metro-text">{c.title}</h3>
              <p className="text-sm text-metro-text-secondary mt-1">
                {c.instructor.name} · {c._count.enrollments} students ·{" "}
                {c._count.sessions} sessions
              </p>
            </Link>
          ))}
          {courses.length === 0 && (
            <p className="text-sm text-metro-text-secondary">No courses.</p>
          )}
        </div>
      </section>

      <section>
        <h2 className="metro-section-title mb-3">
          all sessions (last 60 days onward)
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
