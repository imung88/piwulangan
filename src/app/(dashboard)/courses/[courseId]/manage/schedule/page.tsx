import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import Link from "next/link";
import { redirect, notFound } from "next/navigation";
import { getSessionsForCourse } from "@/lib/schedule";
import ManageScheduleClient from "./ManageScheduleClient";

export default async function ManageSchedulePage({
  params,
}: {
  params: { courseId: string };
}) {
  const session = await auth();
  if (!session?.user) redirect("/login");

  const userId = (session.user as any).id;
  const role = (session.user as any).role;

  const course = await db.course.findUnique({
    where: { id: params.courseId },
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

  return (
    <div>
      <div className="mb-6">
        <Link
          href={`/courses/${course.id}/schedule`}
          className="text-sm text-metro-text-secondary hover:text-metro-text"
        >
          ← Course schedule
        </Link>
        <h1 className="metro-page-title mt-1">
          Manage Sessions — {course.title}
        </h1>
        <p className="text-metro-text-secondary">
          Create sessions, assign students, and record attendance.
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
