import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import Link from "next/link";
import { redirect, notFound } from "next/navigation";
import {
  getSessionsForCourse,
  getSessionsForStudent,
  getCourseAvailability,
} from "@/lib/schedule";
import { toSessionItem, todayStr } from "@/components/schedule/types";
import ScheduleView from "@/components/schedule/ScheduleView";
import AvailabilityDisplay from "@/components/schedule/AvailabilityDisplay";

export default async function CourseSchedulePage({
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
      instructor: { select: { id: true, name: true } },
      enrollments: { where: { userId } },
    },
  });
  if (!course) notFound();

  const isOwner = course.instructorId === userId || role === "ADMIN";
  const isEnrolled = course.enrollments.length > 0;

  if (!isOwner && !isEnrolled) {
    redirect(`/courses/${course.id}`);
  }

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <div>
          <Link
            href={`/courses/${course.id}`}
            className="text-sm text-gray-500 hover:text-gray-700"
          >
            ← {course.title}
          </Link>
          <h1 className="text-2xl font-bold text-gray-900 mt-1">
            Course Schedule
          </h1>
          <p className="text-gray-600">
            Instructor: {course.instructor.name}
          </p>
        </div>
        {isOwner && (
          <Link
            href={`/courses/${course.id}/manage/schedule`}
            className="bg-blue-600 text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-blue-700"
          >
            Manage Sessions
          </Link>
        )}
      </div>

      {isOwner ? (
        <OwnerView courseId={course.id} />
      ) : (
        <StudentView
          courseId={course.id}
          userId={userId}
          instructorName={course.instructor.name}
        />
      )}
    </div>
  );
}

async function OwnerView({ courseId }: { courseId: string }) {
  const sessions = await getSessionsForCourse(courseId);
  return (
    <ScheduleView
      sessions={sessions.map((s) => toSessionItem(s))}
      showCourse={false}
      showAttendees
    />
  );
}

async function StudentView({
  courseId,
  userId,
  instructorName,
}: {
  courseId: string;
  userId: string;
  instructorName: string;
}) {
  const sessions = await getSessionsForStudent(userId, { courseId });
  const hasUpcoming = sessions.some((s) => {
    return s.date.toISOString().split("T")[0] >= todayStr();
  });

  if (sessions.length === 0 || !hasUpcoming) {
    const availability = await getCourseAvailability(courseId);
    return (
      <div className="space-y-6">
        {sessions.length > 0 && (
          <ScheduleView
            sessions={sessions.map((s) => toSessionItem(s, [userId]))}
            showCourse={false}
          />
        )}
        <div>
          <h2 className="text-lg font-semibold text-gray-900 mb-3">
            Instructor Availability
          </h2>
          <AvailabilityDisplay
            windows={availability}
            instructorName={instructorName}
          />
        </div>
      </div>
    );
  }

  return (
    <ScheduleView
      sessions={sessions.map((s) => toSessionItem(s, [userId]))}
      showCourse={false}
    />
  );
}
