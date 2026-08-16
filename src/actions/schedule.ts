/**
 * @module actions/schedule
 * @overview Server actions for instructor availability, blocked dates, class sessions, and attendance tracking.
 * @responsibilities
 *   - Manage instructor weekly availability and blocked dates
 *   - Create, update, cancel, and assign attendees for class sessions
 *   - Record and update student attendance records with notifications
 * @exports
 *   - `setAvailability` / `removeAvailability` / `getInstructorAvailability`: Availability management
 *   - `addBlockedDate` / `removeBlockedDate` / `getBlockedDates`: Blocked date management
 *   - `createSession` / `updateSession` / `cancelSession` / `setSessionAttendees`: Class session management
 *   - `markAttendance` / `markAllPresent`: Attendance recording
 */
"use server";

import { z } from "zod";
import { db } from "@/lib/db";
import { serverT } from "@/lib/i18n/serverT";
import { revalidatePath } from "next/cache";
import { notify, withGuardians } from "@/lib/notifications";
import { requireUser, requireRole, requireCourseManager } from "@/lib/authHelpers";
import { toDateStr } from "@/components/schedule/types";
import type { ActionResult } from "@/types/errors";

const TIME_REGEX = /^\d{2}:\d{2}$/;

function parseDateOnly(dateStr: string) {
  const d = new Date(dateStr);
  d.setHours(0, 0, 0, 0);
  return d;
}

function isPastDate(date: Date) {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  return date.getTime() < today.getTime();
}

function revalidateScheduleViews(courseId: string) {
  revalidatePath("/schedule");
  revalidatePath("/dashboard");
  revalidatePath(`/courses/${courseId}/schedule`);
  revalidatePath(`/courses/${courseId}/manage/schedule`);
}

// ─── Availability Actions ───

const availabilitySchema = z.object({
  dayOfWeek: z.number().min(0).max(6),
  startTime: z.string().regex(TIME_REGEX),
  endTime: z.string().regex(TIME_REGEX),
  courseId: z.string().optional(),
});

export async function setAvailability(formData: FormData): Promise<ActionResult> {
  const user = await requireRole("ADMIN", "INSTRUCTOR");
  if (!user.success) return user;
  const userId = user.data.id;

  const parsed = availabilitySchema.safeParse({
    dayOfWeek: Number(formData.get("dayOfWeek")),
    startTime: formData.get("startTime"),
    endTime: formData.get("endTime"),
    courseId: formData.get("courseId") || undefined,
  });

  if (!parsed.success) {
    return {
      success: false,
      error: await serverT("errors.validationFailed"),
      fieldErrors: parsed.error.flatten().fieldErrors,
    };
  }

  const { dayOfWeek, startTime, endTime, courseId } = parsed.data;

  if (startTime >= endTime) {
    return {
      success: false,
      error: await serverT("errors.validationFailed"),
      fieldErrors: { endTime: [await serverT("errors.endTimeAfterStart")] },
    };
  }

  const existing = await db.availability.findFirst({
    where: { userId, dayOfWeek, startTime, courseId: courseId || null },
  });

  if (existing) {
    await db.availability.update({
      where: { id: existing.id },
      data: { endTime, active: true },
    });
  } else {
    await db.availability.create({
      data: { userId, dayOfWeek, startTime, endTime, courseId: courseId || null },
    });
  }

  revalidatePath("/schedule/availability");
  return { success: true };
}

export async function removeAvailability(id: string): Promise<ActionResult> {
  const user = await requireUser();
  if (!user.success) return user;
  const { id: userId, role } = user.data;

  const availability = await db.availability.findUnique({ where: { id } });
  if (!availability) {
    return { success: false, error: await serverT("errors.availabilityNotFound") };
  }
  if (role !== "ADMIN" && availability.userId !== userId) {
    return { success: false, error: await serverT("errors.unauthorized") };
  }

  await db.availability.delete({ where: { id } });

  revalidatePath("/schedule/availability");
  return { success: true };
}

export async function getInstructorAvailability(instructorId: string) {
  const user = await requireUser();
  if (!user.success) return user;

  const availability = await db.availability.findMany({
    where: { userId: instructorId },
    orderBy: [{ dayOfWeek: "asc" }, { startTime: "asc" }],
  });
  return { success: true, data: availability };
}

// ─── Blocked Date Actions ───

const blockedDateSchema = z.object({
  date: z.string(),
  reason: z.string().max(200).optional(),
});

export async function addBlockedDate(formData: FormData): Promise<ActionResult> {
  const user = await requireRole("ADMIN", "INSTRUCTOR");
  if (!user.success) return user;
  const userId = user.data.id;

  const parsed = blockedDateSchema.safeParse({
    date: formData.get("date"),
    reason: formData.get("reason") || undefined,
  });

  if (!parsed.success) {
    return {
      success: false,
      error: await serverT("errors.validationFailed"),
      fieldErrors: parsed.error.flatten().fieldErrors,
    };
  }

  const date = parseDateOnly(parsed.data.date);

  const existing = await db.blockedDate.findFirst({ where: { userId, date } });
  if (existing) return { success: false, error: await serverT("errors.dateAlreadyBlocked") };

  await db.blockedDate.create({
    data: { userId, date, reason: parsed.data.reason },
  });

  revalidatePath("/schedule/availability");
  return { success: true };
}

export async function removeBlockedDate(id: string): Promise<ActionResult> {
  const user = await requireUser();
  if (!user.success) return user;
  const { id: userId, role } = user.data;

  const blocked = await db.blockedDate.findUnique({ where: { id } });
  if (!blocked) {
    return { success: false, error: await serverT("errors.blockedDateNotFound") };
  }
  if (role !== "ADMIN" && blocked.userId !== userId) {
    return { success: false, error: await serverT("errors.unauthorized") };
  }

  await db.blockedDate.delete({ where: { id } });

  revalidatePath("/schedule/availability");
  return { success: true };
}

export async function getBlockedDates(userId: string) {
  const user = await requireUser();
  if (!user.success) return user;
  const { role } = user.data;

  if (role !== "ADMIN" && user.data.id !== userId) {
    return { success: false, error: await serverT("errors.unauthorized") };
  }

  const blockedDates = await db.blockedDate.findMany({
    where: { userId },
    orderBy: { date: "asc" },
  });
  return { success: true, data: blockedDates };
}

// ─── Class Session Actions ───

const sessionSchema = z.object({
  courseId: z.string(),
  title: z.string().min(1).max(200),
  description: z.string().max(2000).optional(),
  lessonId: z.string().optional(),
  date: z.string(),
  startTime: z.string().regex(TIME_REGEX),
  endTime: z.string().regex(TIME_REGEX),
  location: z.string().max(300).optional(),
  studentIds: z.array(z.string()),
  allEnrolled: z.boolean(),
  repeatWeeks: z.number().int().min(1).max(12),
});

export async function createSession(formData: FormData): Promise<ActionResult> {
  const parsed = sessionSchema.safeParse({
    courseId: formData.get("courseId"),
    title: formData.get("title"),
    description: formData.get("description") || undefined,
    lessonId: formData.get("lessonId") || undefined,
    date: formData.get("date"),
    startTime: formData.get("startTime"),
    endTime: formData.get("endTime"),
    location: formData.get("location") || undefined,
    studentIds: JSON.parse((formData.get("studentIds") as string) || "[]"),
    allEnrolled: formData.get("allEnrolled") === "true",
    repeatWeeks: Number(formData.get("repeatWeeks") || 1),
  });

  if (!parsed.success) {
    return {
      success: false,
      error: await serverT("errors.validationFailed"),
      fieldErrors: parsed.error.flatten().fieldErrors,
    };
  }

  const data = parsed.data;
  const cm = await requireCourseManager(data.courseId);
  if (!cm.success) return cm;
  const { course } = cm.data;

  if (data.startTime >= data.endTime) {
    return { success: false, error: await serverT("errors.endTimeAfterStart") };
  }

  const firstDate = parseDateOnly(data.date);
  if (isNaN(firstDate.getTime())) return { success: false, error: await serverT("errors.invalidDate") };
  if (isPastDate(firstDate)) return { success: false, error: await serverT("errors.sessionInPast") };

  if (data.lessonId) {
    const lesson = await db.lesson.findUnique({
      where: { id: data.lessonId },
      include: { module: { select: { courseId: true } } },
    });
    if (!lesson || lesson.module.courseId !== data.courseId) {
      return { success: false, error: await serverT("errors.lessonNotInCourse") };
    }
  }

  const enrollments = await db.enrollment.findMany({
    where: { courseId: data.courseId },
    select: { userId: true },
  });
  const enrolledIds = new Set(enrollments.map((e) => e.userId));

  const attendeeIds = data.allEnrolled
    ? Array.from(enrolledIds)
    : data.studentIds.filter((id) => enrolledIds.has(id));

  if (attendeeIds.length === 0) {
    return { success: false, error: await serverT("errors.selectStudent") };
  }

  const dates: Date[] = [];
  for (let week = 0; week < data.repeatWeeks; week++) {
    const d = new Date(firstDate);
    d.setDate(d.getDate() + week * 7);
    dates.push(d);
  }

  await db.$transaction(
    dates.map((date) =>
      db.classSession.create({
        data: {
          courseId: data.courseId,
          instructorId: course.instructorId,
          lessonId: data.lessonId || null,
          title: data.title,
          description: data.description,
          date,
          startTime: data.startTime,
          endTime: data.endTime,
          location: data.location,
          attendees: {
            createMany: {
              data: attendeeIds.map((studentId) => ({ studentId })),
            },
          },
        },
      })
    )
  );

  await notify(
    await withGuardians(attendeeIds),
    "SESSION_CREATED",
    `New session: ${data.title}`,
    {
      body: `${course.title} — ${data.date} at ${data.startTime}${
        data.repeatWeeks > 1 ? ` (repeats weekly, ${data.repeatWeeks} weeks)` : ""
      }`,
      link: `/courses/${data.courseId}/schedule`,
    }
  );

  revalidateScheduleViews(data.courseId);
  return { success: true };
}

const sessionUpdateSchema = sessionSchema.omit({
  courseId: true,
  studentIds: true,
  allEnrolled: true,
  repeatWeeks: true,
});

export async function updateSession(
  sessionId: string,
  formData: FormData
): Promise<ActionResult> {
  const existing = await db.classSession.findUnique({
    where: { id: sessionId },
    include: { attendees: true, course: { select: { title: true } } },
  });
  if (!existing) return { success: false, error: await serverT("errors.sessionNotFound") };

  const cm = await requireCourseManager(existing.courseId);
  if (!cm.success) return cm;

  if (existing.status === "CANCELLED") {
    return { success: false, error: await serverT("errors.cannotEditCancelled") };
  }

  const parsed = sessionUpdateSchema.safeParse({
    title: formData.get("title"),
    description: formData.get("description") || undefined,
    lessonId: formData.get("lessonId") || undefined,
    date: formData.get("date"),
    startTime: formData.get("startTime"),
    endTime: formData.get("endTime"),
    location: formData.get("location") || undefined,
  });

  if (!parsed.success) {
    return {
      success: false,
      error: await serverT("errors.validationFailed"),
      fieldErrors: parsed.error.flatten().fieldErrors,
    };
  }

  const data = parsed.data;

  if (data.startTime >= data.endTime) {
    return { success: false, error: await serverT("errors.endTimeAfterStart") };
  }

  const date = parseDateOnly(data.date);
  if (isNaN(date.getTime())) return { success: false, error: await serverT("errors.invalidDate") };
  if (isPastDate(date)) return { success: false, error: await serverT("errors.cannotMovePast") };

  if (data.lessonId) {
    const lesson = await db.lesson.findUnique({
      where: { id: data.lessonId },
      include: { module: { select: { courseId: true } } },
    });
    if (!lesson || lesson.module.courseId !== existing.courseId) {
      return { success: false, error: await serverT("errors.lessonNotInCourse") };
    }
  }

  await db.classSession.update({
    where: { id: sessionId },
    data: {
      title: data.title,
      description: data.description ?? null,
      lessonId: data.lessonId || null,
      date,
      startTime: data.startTime,
      endTime: data.endTime,
      location: data.location ?? null,
    },
  });

  await notify(
    await withGuardians(existing.attendees.map((a) => a.studentId)),
    "SESSION_UPDATED",
    `Session updated: ${data.title}`,
    {
      body: `${existing.course.title} — now ${data.date} at ${data.startTime}`,
      link: `/courses/${existing.courseId}/schedule`,
    }
  );

  revalidateScheduleViews(existing.courseId);
  return { success: true };
}

export async function cancelSession(
  sessionId: string,
  reason?: string
): Promise<ActionResult> {
  const existing = await db.classSession.findUnique({
    where: { id: sessionId },
    include: { attendees: true, course: { select: { title: true } } },
  });
  if (!existing) return { success: false, error: await serverT("errors.sessionNotFound") };

  const cm = await requireCourseManager(existing.courseId);
  if (!cm.success) return cm;

  if (existing.status === "CANCELLED") {
    return { success: false, error: await serverT("errors.alreadyCancelled") };
  }

  await db.classSession.update({
    where: { id: sessionId },
    data: { status: "CANCELLED", cancelReason: reason },
  });

  await notify(
    await withGuardians(existing.attendees.map((a) => a.studentId)),
    "SESSION_CANCELLED",
    `Session cancelled: ${existing.title}`,
    {
      body: `${existing.course.title} — ${toDateStr(existing.date)} at ${existing.startTime}${
        reason ? `. Reason: ${reason}` : ""
      }`,
      link: `/courses/${existing.courseId}/schedule`,
    }
  );

  revalidateScheduleViews(existing.courseId);
  return { success: true };
}

export async function setSessionAttendees(
  sessionId: string,
  studentIds: string[]
): Promise<ActionResult> {
  const existing = await db.classSession.findUnique({
    where: { id: sessionId },
    include: { attendees: true, course: { select: { title: true } } },
  });
  if (!existing) return { success: false, error: await serverT("errors.sessionNotFound") };

  const cm = await requireCourseManager(existing.courseId);
  if (!cm.success) return cm;

  const enrollments = await db.enrollment.findMany({
    where: { courseId: existing.courseId },
    select: { userId: true },
  });
  const enrolledIds = new Set(enrollments.map((e) => e.userId));
  const targetIds = studentIds.filter((id) => enrolledIds.has(id));

  if (targetIds.length === 0) {
    return { success: false, error: await serverT("errors.selectStudent") };
  }

  const currentIds = existing.attendees.map((a) => a.studentId);
  const toAdd = targetIds.filter((id) => !currentIds.includes(id));
  const toRemove = currentIds.filter((id) => !targetIds.includes(id));

  await db.$transaction([
    db.sessionAttendee.deleteMany({
      where: { sessionId, studentId: { in: toRemove } },
    }),
    db.sessionAttendee.createMany({
      data: toAdd.map((studentId) => ({ sessionId, studentId })),
    }),
  ]);

  if (toAdd.length > 0) {
    await notify(
      await withGuardians(toAdd),
      "SESSION_CREATED",
      `New session: ${existing.title}`,
      {
        body: `${existing.course.title} — ${toDateStr(existing.date)} at ${existing.startTime}`,
        link: `/courses/${existing.courseId}/schedule`,
      }
    );
  }

  if (toRemove.length > 0) {
    await notify(
      await withGuardians(toRemove),
      "SESSION_REMOVED",
      `Removed from session: ${existing.title}`,
      {
        body: `${existing.course.title} — ${toDateStr(existing.date)} at ${existing.startTime}`,
        link: `/courses/${existing.courseId}/schedule`,
      }
    );
  }

  revalidateScheduleViews(existing.courseId);
  return { success: true };
}

// ─── Attendance Actions ───

const attendanceSchema = z.object({
  sessionId: z.string(),
  studentId: z.string(),
  attendance: z.enum(["PRESENT", "ABSENT", "LATE", "NONE"]),
  notes: z.string().max(500).optional(),
});

function completesOnDate(date: Date) {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  return date.getTime() <= today.getTime();
}

export async function markAttendance(formData: FormData): Promise<ActionResult> {
  const parsed = attendanceSchema.safeParse({
    sessionId: formData.get("sessionId"),
    studentId: formData.get("studentId"),
    attendance: formData.get("attendance"),
    notes: formData.get("notes") ?? undefined,
  });

  if (!parsed.success) {
    return {
      success: false,
      error: await serverT("errors.validationFailed"),
      fieldErrors: parsed.error.flatten().fieldErrors,
    };
  }

  const { sessionId, studentId, attendance, notes } = parsed.data;
  const newAttendance = attendance === "NONE" ? null : attendance;
  const newNotes = notes && notes.trim().length > 0 ? notes : null;

  const classSession = await db.classSession.findUnique({
    where: { id: sessionId },
    include: { course: { select: { title: true } } },
  });
  if (!classSession) return { success: false, error: await serverT("errors.sessionNotFound") };

  const cm = await requireCourseManager(classSession.courseId);
  if (!cm.success) return cm;

  const attendee = await db.sessionAttendee.findUnique({
    where: { sessionId_studentId: { sessionId, studentId } },
  });
  if (!attendee) return { success: false, error: await serverT("errors.studentNotAssigned") };

  const prevAttendance = attendee.attendance;

  await db.sessionAttendee.update({
    where: { id: attendee.id },
    data: {
      attendance: newAttendance,
      notes: newNotes,
      recordedAt: newAttendance ? new Date() : null,
    },
  });

  // A session with recorded attendance on a past/current date is complete.
  if (
    newAttendance &&
    classSession.status === "SCHEDULED" &&
    completesOnDate(classSession.date)
  ) {
    await db.classSession.update({
      where: { id: sessionId },
      data: { status: "COMPLETED" },
    });
  }

  // Notify only when the status actually changes TO absent.
  if (newAttendance === "ABSENT" && prevAttendance !== "ABSENT") {
    const guardians = await db.guardianStudent.findMany({
      where: { studentId },
      select: { guardianId: true },
    });
    await notify(
      [studentId, ...guardians.map((g) => g.guardianId)],
      "ATTENDANCE_ABSENT",
      `Marked absent: ${classSession.title}`,
      {
        body: `${classSession.course.title} — ${toDateStr(classSession.date)}${
          newNotes ? `. ${newNotes}` : ""
        }`,
        link: `/courses/${classSession.courseId}/schedule`,
      }
    );
  }

  revalidateScheduleViews(classSession.courseId);
  return { success: true };
}

export async function markAllPresent(sessionId: string): Promise<ActionResult> {
  const classSession = await db.classSession.findUnique({
    where: { id: sessionId },
  });
  if (!classSession) return { success: false, error: await serverT("errors.sessionNotFound") };

  const cm = await requireCourseManager(classSession.courseId);
  if (!cm.success) return cm;

  await db.sessionAttendee.updateMany({
    where: { sessionId },
    data: { attendance: "PRESENT", recordedAt: new Date() },
  });

  if (
    classSession.status === "SCHEDULED" &&
    completesOnDate(classSession.date)
  ) {
    await db.classSession.update({
      where: { id: sessionId },
      data: { status: "COMPLETED" },
    });
  }

  revalidateScheduleViews(classSession.courseId);
  return { success: true };
}
