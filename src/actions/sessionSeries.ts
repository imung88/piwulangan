/**
 * @module actions/sessionSeries
 * @overview Server actions for managing recurring session series.
 * @responsibilities
 *   - Create, update, and cancel session series
 *   - Handle series exceptions (skip/cancel individual weeks)
 *   - Detect and prevent scheduling conflicts
 * @exports
 *   - `createSessionSeries`: Create a new series with linked sessions
 *   - `updateSessionSeries`: Update all sessions in a series
 *   - `cancelSessionSeries`: Cancel all sessions in a series
 *   - `addSeriesException`: Skip/cancel an individual week
 *   - `removeSeriesException`: Re-enable a skipped week
 *   - `getSeriesWithSessions`: Fetch a series with its sessions and exceptions
 */
"use server";

import { z } from "zod";
import { db } from "@/lib/db";
import { serverT } from "@/lib/i18n/serverT";
import { notify, withGuardians } from "@/lib/notifications";
import { requireRole, requireCourseManager } from "@/lib/authHelpers";
import { parseDateOnly, isPastDate, toDateStr } from "@/lib/scheduleUtils";
import { revalidatePath } from "next/cache";
import type { ActionResult } from "@/types/errors";

function revalidateScheduleViews(courseId: string) {
  revalidatePath("/schedule");
  revalidatePath("/dashboard");
  revalidatePath(`/courses/${courseId}/schedule`);
  revalidatePath(`/courses/${courseId}/manage/schedule`);
}

const TIME_REGEX = /^\d{2}:\d{2}$/;

// ─── Series Actions ───

const seriesSchema = z.object({
  courseId: z.string(),
  title: z.string().min(1).max(200),
  description: z.string().max(2000).optional(),
  lessonId: z.string().optional(),
  location: z.string().max(300).optional(),
  startTime: z.string().regex(TIME_REGEX),
  endTime: z.string().regex(TIME_REGEX),
  startDate: z.string(),
  repeatWeeks: z.number().int().min(1).max(12),
  studentIds: z.array(z.string()),
  allEnrolled: z.boolean(),
});

export async function createSessionSeries(formData: FormData): Promise<ActionResult<{ seriesId: string }>> {
  const user = await requireRole("ADMIN", "INSTRUCTOR");
  if (!user.success) return user;

  const parsed = seriesSchema.safeParse({
    courseId: formData.get("courseId"),
    title: formData.get("title"),
    description: formData.get("description") || undefined,
    lessonId: formData.get("lessonId") || undefined,
    location: formData.get("location") || undefined,
    startTime: formData.get("startTime"),
    endTime: formData.get("endTime"),
    startDate: formData.get("startDate"),
    repeatWeeks: Number(formData.get("repeatWeeks") || 1),
    studentIds: JSON.parse((formData.get("studentIds") as string) || "[]"),
    allEnrolled: formData.get("allEnrolled") === "true",
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

  const firstDate = parseDateOnly(data.startDate);
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

  // Generate dates for the series
  const dates: Date[] = [];
  for (let week = 0; week < data.repeatWeeks; week++) {
    const d = new Date(firstDate);
    d.setDate(d.getDate() + week * 7);
    dates.push(d);
  }

  // Batch conflict checking: query all existing sessions for the instructor in the date range
  const lastDate = dates[dates.length - 1];
  const existingInstructorSessions = await db.classSession.findMany({
    where: {
      instructorId: course.instructorId,
      date: { gte: firstDate, lte: lastDate },
      status: { not: "CANCELLED" },
    },
    select: { id: true, title: true, date: true, startTime: true, endTime: true },
  });

  // Check instructor conflicts in memory
  for (const date of dates) {
    const dateStr = toDateStr(date);
    for (const existing of existingInstructorSessions) {
      if (toDateStr(existing.date) === dateStr &&
          existing.startTime < data.endTime &&
          existing.endTime > data.startTime) {
        return {
          success: false,
          error: `Instructor already has a session "${existing.title}" at this time`,
        };
      }
    }
  }

  // Batch conflict checking for students
  if (attendeeIds.length > 0) {
    const existingStudentSessions = await db.sessionAttendee.findMany({
      where: {
        studentId: { in: attendeeIds },
        session: {
          date: { gte: firstDate, lte: lastDate },
          status: { not: "CANCELLED" },
        },
      },
      include: {
        student: { select: { id: true, name: true } },
        session: { select: { id: true, title: true, date: true, startTime: true, endTime: true } },
      },
    });

    // Check student conflicts in memory
    for (const date of dates) {
      const dateStr = toDateStr(date);
      for (const attendee of existingStudentSessions) {
        if (toDateStr(attendee.session.date) === dateStr &&
            attendee.session.startTime < data.endTime &&
            attendee.session.endTime > data.startTime) {
          return {
            success: false,
            error: `Student "${attendee.student.name}" has a conflicting session "${attendee.session.title}" at this time`,
          };
        }
      }
    }
  }

  // Create series and sessions in a transaction
  const series = await db.$transaction(async (tx) => {
    // Create the series record
    const newSeries = await tx.sessionSeries.create({
      data: {
        courseId: data.courseId,
        instructorId: course.instructorId,
        title: data.title,
        description: data.description,
        lessonId: data.lessonId || null,
        location: data.location,
        startTime: data.startTime,
        endTime: data.endTime,
        startDate: firstDate,
        repeatWeeks: data.repeatWeeks,
      },
    });

    // Create all sessions in the series
    const sessions = await Promise.all(
      dates.map((date, index) =>
        tx.classSession.create({
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
            seriesId: newSeries.id,
            seriesWeek: index + 1,
            attendees: {
              createMany: {
                data: attendeeIds.map((studentId) => ({ studentId })),
              },
            },
          },
        })
      )
    );

    return { series: newSeries, sessions };
  });

  // Send notifications
  await notify(
    await withGuardians(attendeeIds),
    "SESSION_CREATED",
    `New recurring session: ${data.title}`,
    {
      body: `${course.title} — ${data.repeatWeeks} weeks starting ${data.startDate} at ${data.startTime}`,
      link: `/courses/${data.courseId}/schedule`,
    }
  );

  revalidateScheduleViews(data.courseId);
  return { success: true, data: { seriesId: series.series.id } };
}

const seriesUpdateSchema = seriesSchema.omit({
  courseId: true,
  studentIds: true,
  allEnrolled: true,
  repeatWeeks: true,
});

export async function updateSessionSeries(
  seriesId: string,
  formData: FormData
): Promise<ActionResult> {
  const existing = await db.sessionSeries.findUnique({
    where: { id: seriesId },
    include: { sessions: { select: { id: true, status: true } } },
  });
  if (!existing) return { success: false, error: await serverT("errors.sessionNotFound") };

  const cm = await requireCourseManager(existing.courseId);
  if (!cm.success) return cm;

  // Don't allow updating cancelled sessions
  const cancelledSessions = existing.sessions.filter((s) => s.status === "CANCELLED");
  if (cancelledSessions.length > 0) {
    return { success: false, error: await serverT("errors.cannotEditCancelled") };
  }

  const parsed = seriesUpdateSchema.safeParse({
    title: formData.get("title"),
    description: formData.get("description") || undefined,
    lessonId: formData.get("lessonId") || undefined,
    location: formData.get("location") || undefined,
    startTime: formData.get("startTime"),
    endTime: formData.get("endTime"),
    startDate: formData.get("startDate"),
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

  if (data.lessonId) {
    const lesson = await db.lesson.findUnique({
      where: { id: data.lessonId },
      include: { module: { select: { courseId: true } } },
    });
    if (!lesson || lesson.module.courseId !== existing.courseId) {
      return { success: false, error: await serverT("errors.lessonNotInCourse") };
    }
  }

  // Update series and all non-cancelled sessions
  await db.$transaction(async (tx) => {
    await tx.sessionSeries.update({
      where: { id: seriesId },
      data: {
        title: data.title,
        description: data.description,
        lessonId: data.lessonId || null,
        location: data.location,
        startTime: data.startTime,
        endTime: data.endTime,
        startDate: parseDateOnly(data.startDate),
      },
    });

    // Update all non-cancelled sessions
    await tx.classSession.updateMany({
      where: {
        seriesId,
        status: { not: "CANCELLED" },
      },
      data: {
        title: data.title,
        description: data.description,
        lessonId: data.lessonId || null,
        location: data.location,
        startTime: data.startTime,
        endTime: data.endTime,
      },
    });
  });

  revalidateScheduleViews(existing.courseId);
  return { success: true };
}

export async function cancelSessionSeries(
  seriesId: string,
  reason?: string
): Promise<ActionResult> {
  const existing = await db.sessionSeries.findUnique({
    where: { id: seriesId },
  });
  if (!existing) return { success: false, error: await serverT("errors.sessionNotFound") };

  const cm = await requireCourseManager(existing.courseId);
  if (!cm.success) return cm;

  // Count scheduled sessions before cancellation
  const scheduledCount = await db.classSession.count({
    where: {
      seriesId,
      status: "SCHEDULED",
    },
  });

  // Cancel all scheduled sessions (no transaction needed for single updateMany)
  await db.classSession.updateMany({
    where: {
      seriesId,
      status: "SCHEDULED",
    },
    data: {
      status: "CANCELLED",
      cancelReason: reason,
    },
  });

  // Fetch all affected student IDs in a single query
  const affectedAttendees = await db.sessionAttendee.findMany({
    where: {
      session: {
        seriesId,
        status: "CANCELLED",
        cancelReason: reason,
      },
    },
    select: { studentId: true },
  });

  const affectedStudentIds = [...new Set(affectedAttendees.map((a) => a.studentId))];

  if (affectedStudentIds.length > 0) {
    await notify(
      await withGuardians(affectedStudentIds),
      "SESSION_CANCELLED",
      `Recurring session cancelled: ${existing.title}`,
      {
        body: `${existing.title} — ${scheduledCount} sessions cancelled${reason ? `. Reason: ${reason}` : ""}`,
        link: `/courses/${existing.courseId}/schedule`,
      }
    );
  }

  revalidateScheduleViews(existing.courseId);
  return { success: true };
}

export async function addSeriesException(
  seriesId: string,
  weekNumber: number,
  reason?: string
): Promise<ActionResult> {
  const existing = await db.sessionSeries.findUnique({
    where: { id: seriesId },
    include: {
      sessions: {
        where: { seriesWeek: weekNumber },
        select: { id: true, status: true },
      },
    },
  });
  if (!existing) return { success: false, error: await serverT("errors.sessionNotFound") };

  const cm = await requireCourseManager(existing.courseId);
  if (!cm.success) return cm;

  if (existing.sessions.length === 0) {
    return { success: false, error: await serverT("errors.invalidWeek") };
  }

  const session = existing.sessions[0];
  if (session.status === "CANCELLED") {
    return { success: false, error: await serverT("errors.alreadyCancelled") };
  }

  // Create exception and cancel the session
  await db.$transaction(async (tx) => {
    await tx.sessionSeriesException.create({
      data: {
        seriesId,
        weekNumber,
        reason,
      },
    });

    await tx.classSession.update({
      where: { id: session.id },
      data: {
        status: "CANCELLED",
        cancelReason: reason || "Skipped in series",
      },
    });
  });

  revalidateScheduleViews(existing.courseId);
  return { success: true };
}

export async function removeSeriesException(
  seriesId: string,
  weekNumber: number
): Promise<ActionResult> {
  const existing = await db.sessionSeries.findUnique({
    where: { id: seriesId },
    include: {
      sessions: {
        where: { seriesWeek: weekNumber },
        select: { id: true, status: true },
      },
    },
  });
  if (!existing) return { success: false, error: await serverT("errors.sessionNotFound") };

  const cm = await requireCourseManager(existing.courseId);
  if (!cm.success) return cm;

  if (existing.sessions.length === 0) {
    return { success: false, error: await serverT("errors.invalidWeek") };
  }

  const session = existing.sessions[0];

  // Remove exception and reschedule the session
  await db.$transaction(async (tx) => {
    await tx.sessionSeriesException.deleteMany({
      where: {
        seriesId,
        weekNumber,
      },
    });

    await tx.classSession.update({
      where: { id: session.id },
      data: {
        status: "SCHEDULED",
        cancelReason: null,
      },
    });
  });

  revalidateScheduleViews(existing.courseId);
  return { success: true };
}

export async function getSeriesWithSessions(seriesId: string) {
  const series = await db.sessionSeries.findUnique({
    where: { id: seriesId },
    include: {
      sessions: {
        orderBy: [{ date: "asc" }, { startTime: "asc" }],
        include: {
          attendees: {
            include: { student: { select: { id: true, name: true } } },
          },
        },
      },
      exceptions: {
        orderBy: { weekNumber: "asc" },
      },
    },
  });

  return series;
}
