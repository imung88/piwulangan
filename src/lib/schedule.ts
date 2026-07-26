import { db } from "./db";

export const DAY_NAMES = [
  "Sunday",
  "Monday",
  "Tuesday",
  "Wednesday",
  "Thursday",
  "Friday",
  "Saturday",
];

export function startOfToday() {
  const d = new Date();
  d.setHours(0, 0, 0, 0);
  return d;
}

const sessionInclude = {
  course: { select: { id: true, title: true } },
  instructor: { select: { id: true, name: true } },
  lesson: { select: { id: true, title: true, moduleId: true } },
  attendees: {
    include: { student: { select: { id: true, name: true, email: true } } },
  },
} as const;

export type SessionWithDetails = NonNullable<
  Awaited<ReturnType<typeof getSessionById>>
>;

export async function getSessionById(sessionId: string) {
  return db.classSession.findUnique({
    where: { id: sessionId },
    include: sessionInclude,
  });
}

export async function getSessionsForCourse(courseId: string) {
  return db.classSession.findMany({
    where: { courseId },
    include: sessionInclude,
    orderBy: [{ date: "asc" }, { startTime: "asc" }],
  });
}

export async function getSessionsForStudent(
  studentId: string,
  opts?: { courseId?: string; from?: Date; to?: Date; limit?: number }
) {
  return db.classSession.findMany({
    where: {
      attendees: { some: { studentId } },
      status: { not: "CANCELLED" },
      ...(opts?.courseId ? { courseId: opts.courseId } : {}),
      date: {
        ...(opts?.from ? { gte: opts.from } : {}),
        ...(opts?.to ? { lte: opts.to } : {}),
      },
    },
    include: sessionInclude,
    orderBy: [{ date: "asc" }, { startTime: "asc" }],
    ...(opts?.limit ? { take: opts.limit } : {}),
  });
}

export async function getSessionsForStudents(
  studentIds: string[],
  opts?: { from?: Date; limit?: number }
) {
  return db.classSession.findMany({
    where: {
      attendees: { some: { studentId: { in: studentIds } } },
      status: { not: "CANCELLED" },
      ...(opts?.from ? { date: { gte: opts.from } } : {}),
    },
    include: sessionInclude,
    orderBy: [{ date: "asc" }, { startTime: "asc" }],
    ...(opts?.limit ? { take: opts.limit } : {}),
  });
}

export async function getSessionsForInstructor(
  instructorId: string,
  opts?: { from?: Date; to?: Date; limit?: number }
) {
  return db.classSession.findMany({
    where: {
      instructorId,
      status: { not: "CANCELLED" },
      date: {
        ...(opts?.from ? { gte: opts.from } : {}),
        ...(opts?.to ? { lte: opts.to } : {}),
      },
    },
    include: sessionInclude,
    orderBy: [{ date: "asc" }, { startTime: "asc" }],
    ...(opts?.limit ? { take: opts.limit } : {}),
  });
}

export async function getAllSessions(opts?: {
  from?: Date;
  to?: Date;
  limit?: number;
}) {
  return db.classSession.findMany({
    where: {
      date: {
        ...(opts?.from ? { gte: opts.from } : {}),
        ...(opts?.to ? { lte: opts.to } : {}),
      },
    },
    include: sessionInclude,
    orderBy: [{ date: "asc" }, { startTime: "asc" }],
    ...(opts?.limit ? { take: opts.limit } : {}),
  });
}

/**
 * Weekly availability for a course's instructor: course-specific windows
 * plus general (courseId = null) windows. Shown to students who have no
 * assigned sessions yet.
 */
export async function getCourseAvailability(courseId: string) {
  const course = await db.course.findUnique({
    where: { id: courseId },
    select: { instructorId: true },
  });
  if (!course) return [];

  return db.availability.findMany({
    where: {
      userId: course.instructorId,
      active: true,
      OR: [{ courseId: null }, { courseId }],
    },
    orderBy: [{ dayOfWeek: "asc" }, { startTime: "asc" }],
  });
}
