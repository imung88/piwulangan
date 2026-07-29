import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import Link from "next/link";
import { redirect, notFound } from "next/navigation";
import {
  getSessionsForCourse,
  getSessionsForStudent,
  getSessionsForStudents,
  getCourseAvailability,
} from "@/lib/schedule";
import { toSessionItem, todayStr } from "@/components/schedule/types";
import ScheduleView from "@/components/schedule/ScheduleView";
import AvailabilityDisplay from "@/components/schedule/AvailabilityDisplay";
import { getServerT, formatT } from "@/lib/i18n/serverT";

export default async function CourseSchedulePage({
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
      instructor: { select: { id: true, name: true } },
      enrollments: { where: { userId } },
    },
  });
  if (!course) notFound();

  const isOwner = course.instructorId === userId || role === "ADMIN";
  const isEnrolled = course.enrollments.length > 0;

  // Guardian: view linked students' sessions for this course
  let guardianStudentIds: string[] = [];
  if (role === "GUARDIAN") {
    const links = await db.guardianStudent.findMany({
      where: {
        guardianId: userId,
        student: { enrollments: { some: { courseId: course.id } } },
      },
      select: { studentId: true },
    });
    guardianStudentIds = links.map((l) => l.studentId);
  }
  const isGuardianViewer = guardianStudentIds.length > 0;

  const labels = {
    back: t("courseSchedule.back"),
    title: t("courseSchedule.title"),
    instructor: t("courseSchedule.instructor"),
    manageSessions: t("courseSchedule.manageSessions"),
    instructorAvailability: t("courseSchedule.instructorAvailability"),
    noSessionsForStudents: t("courseSchedule.noSessionsForStudents"),
  };

  if (!isOwner && !isEnrolled && !isGuardianViewer) {
    redirect(`/courses/${course.id}`);
  }

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <div>
          <Link
            href={`/courses/${course.id}`}
            className="text-sm text-metro-text-secondary hover:text-metro-text"
          >
            {labels.back}
          </Link>
          <h1 className="metro-page-title mt-1">
            {formatT(labels.title, { title: course.title })}
          </h1>
          <p className="text-metro-text-secondary">
            {labels.instructor}: {course.instructor.name}
          </p>
        </div>
        {isOwner && (
          <Link
            href={`/courses/${course.id}/manage/schedule`}
            className="bg-metro-blue text-white px-4 py-2 text-sm font-medium hover:bg-metro-blue-hover"
          >
            {labels.manageSessions}
          </Link>
        )}
      </div>


      {isOwner ? (
        <OwnerView courseId={course.id} />
      ) : isGuardianViewer ? (
        <GuardianView courseId={course.id} studentIds={guardianStudentIds} />
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

async function GuardianView({
  courseId,
  studentIds,
}: {
  courseId: string;
  studentIds: string[];
}) {
  const sessions = await getSessionsForStudents(studentIds, { courseId });
  if (sessions.length === 0) {
    const t = await getServerT();
    const noSessions = t("courseSchedule.noSessionsForStudents");
    return (
      <p className="text-sm text-metro-text-secondary">{noSessions}</p>
    );
  }
  return (
    <ScheduleView
      sessions={sessions.map((s) => toSessionItem(s, studentIds))}
      showCourse={false}
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
          <h2 className="metro-section-title mb-3">
            instructor availability
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
