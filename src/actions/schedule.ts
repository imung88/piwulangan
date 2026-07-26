"use server";

import { z } from "zod";
import { db } from "@/lib/db";
import { auth } from "@/lib/auth";
import { revalidatePath } from "next/cache";
import { getAvailableSlots } from "@/lib/schedule";

// ─── Availability Actions ───

const availabilitySchema = z.object({
  dayOfWeek: z.number().min(0).max(6),
  startTime: z.string().regex(/^\d{2}:\d{2}$/),
  endTime: z.string().regex(/^\d{2}:\d{2}$/),
  courseId: z.string().optional(),
});

export async function setAvailability(formData: FormData) {
  const session = await auth();
  if (!session?.user) throw new Error("Not authenticated");
  const role = (session.user as any).role;
  const userId = (session.user as any).id;

  if (role !== "ADMIN" && role !== "INSTRUCTOR") {
    throw new Error("Not authorized");
  }

  const parsed = availabilitySchema.safeParse({
    dayOfWeek: Number(formData.get("dayOfWeek")),
    startTime: formData.get("startTime"),
    endTime: formData.get("endTime"),
    courseId: formData.get("courseId") || undefined,
  });

  if (!parsed.success) {
    return { error: parsed.error.flatten().fieldErrors };
  }

  const { dayOfWeek, startTime, endTime, courseId } = parsed.data;

  // Validate endTime > startTime
  if (startTime >= endTime) {
    return { error: { endTime: ["End time must be after start time"] } };
  }

  // Check if availability already exists for this slot
  const existing = await db.availability.findFirst({
    where: {
      userId,
      dayOfWeek,
      startTime,
      courseId: courseId || null,
    },
  });

  if (existing) {
    // Update existing
    await db.availability.update({
      where: { id: existing.id },
      data: { endTime, active: true },
    });
  } else {
    // Create new
    await db.availability.create({
      data: {
        userId,
        dayOfWeek,
        startTime,
        endTime,
        courseId: courseId || null,
      },
    });
  }

  revalidatePath("/schedule/availability");
  return { success: true };
}

export async function removeAvailability(id: string) {
  const session = await auth();
  if (!session?.user) throw new Error("Not authenticated");
  const role = (session.user as any).role;
  const userId = (session.user as any).id;

  const availability = await db.availability.findUnique({ where: { id } });
  if (!availability) throw new Error("Availability not found");
  if (role !== "ADMIN" && availability.userId !== userId) {
    throw new Error("Not authorized");
  }

  await db.availability.delete({ where: { id } });

  revalidatePath("/schedule/availability");
  return { success: true };
}

export async function getInstructorAvailability(instructorId: string) {
  return db.availability.findMany({
    where: { userId: instructorId },
    orderBy: [{ dayOfWeek: "asc" }, { startTime: "asc" }],
  });
}

// ─── Blocked Date Actions ───

const blockedDateSchema = z.object({
  date: z.string(),
  reason: z.string().max(200).optional(),
});

export async function addBlockedDate(formData: FormData) {
  const session = await auth();
  if (!session?.user) throw new Error("Not authenticated");
  const role = (session.user as any).role;
  const userId = (session.user as any).id;

  if (role !== "ADMIN" && role !== "INSTRUCTOR") {
    throw new Error("Not authorized");
  }

  const parsed = blockedDateSchema.safeParse({
    date: formData.get("date"),
    reason: formData.get("reason") || undefined,
  });

  if (!parsed.success) {
    return { error: parsed.error.flatten().fieldErrors };
  }

  const dateStr = parsed.data.date;

  // Check if already blocked
  const existing = await db.blockedDate.findFirst({
    where: { userId, date: new Date(dateStr) },
  });

  if (existing) return { error: "Date is already blocked" };

  await db.blockedDate.create({
    data: {
      userId,
      date: new Date(dateStr),
      reason: parsed.data.reason,
    },
  });

  revalidatePath("/schedule/availability");
  return { success: true };
}

export async function removeBlockedDate(id: string) {
  const session = await auth();
  if (!session?.user) throw new Error("Not authenticated");
  const role = (session.user as any).role;
  const userId = (session.user as any).id;

  const blocked = await db.blockedDate.findUnique({ where: { id } });
  if (!blocked) throw new Error("Blocked date not found");
  if (role !== "ADMIN" && blocked.userId !== userId) {
    throw new Error("Not authorized");
  }

  await db.blockedDate.delete({ where: { id } });

  revalidatePath("/schedule/availability");
  return { success: true };
}

export async function getBlockedDates(userId: string) {
  return db.blockedDate.findMany({
    where: { userId },
    orderBy: { date: "asc" },
  });
}

// ─── Booking Actions ───

const bookingSchema = z.object({
  courseId: z.string(),
  studentIds: z.array(z.string()).min(1),
  date: z.string(),
  startTime: z.string().regex(/^\d{2}:\d{2}$/),
  endTime: z.string().regex(/^\d{2}:\d{2}$/),
});

export async function createBooking(formData: FormData) {
  const session = await auth();
  if (!session?.user) throw new Error("Not authenticated");
  const role = (session.user as any).role;
  const userId = (session.user as any).id;

  if (role !== "ADMIN" && role !== "INSTRUCTOR") {
    throw new Error("Not authorized");
  }

  const studentIds = JSON.parse(formData.get("studentIds") as string || "[]");

  const parsed = bookingSchema.safeParse({
    courseId: formData.get("courseId"),
    studentIds,
    date: formData.get("date"),
    startTime: formData.get("startTime"),
    endTime: formData.get("endTime"),
  });

  if (!parsed.success) {
    return { error: parsed.error.flatten().fieldErrors };
  }

  const { courseId, studentIds: students, date, startTime, endTime } = parsed.data;

  // Verify course exists and user has access
  const course = await db.course.findUnique({ where: { id: courseId } });
  if (!course) return { error: "Course not found" };
  if (role !== "ADMIN" && course.instructorId !== userId) {
    return { error: "Not authorized" };
  }

  const instructorId = role === "ADMIN" ? course.instructorId : userId;

  // Check slot availability
  const bookingDate = new Date(date);
  const slots = await getAvailableSlots(instructorId, courseId, bookingDate);
  const slotAvailable = slots.some(
    (s) => s.startTime === startTime && s.endTime === endTime
  );

  if (!slotAvailable) {
    return { error: "Time slot is not available" };
  }

  // Create bookings (one per student, same time slot)
  const bookingDateObj = new Date(date);
  for (const studentId of students) {
    // Verify student is enrolled
    const enrollment = await db.enrollment.findUnique({
      where: { userId_courseId: { userId: studentId, courseId } },
    });
    if (!enrollment) continue;

    await db.booking.create({
      data: {
        courseId,
        studentId,
        instructorId,
        date: bookingDateObj,
        startTime,
        endTime,
        status: "CONFIRMED",
      },
    });
  }

  revalidatePath("/schedule");
  revalidatePath("/admin/schedule");
  return { success: true };
}

export async function cancelBooking(bookingId: string, reason?: string) {
  const session = await auth();
  if (!session?.user) throw new Error("Not authenticated");
  const role = (session.user as any).role;
  const userId = (session.user as any).id;

  const booking = await db.booking.findUnique({
    where: { id: bookingId },
    include: { course: true },
  });

  if (!booking) return { error: "Booking not found" };

  // Students can only cancel their own bookings
  if (role === "STUDENT" && booking.studentId !== userId) {
    return { error: "Not authorized" };
  }

  // Instructors/admins can cancel any booking for their courses
  if (role === "INSTRUCTOR" && booking.course.instructorId !== userId) {
    return { error: "Not authorized" };
  }

  // Check cancellation window for students
  if (role === "STUDENT") {
    const course = booking.course;
    const bookingDateTime = new Date(booking.date);
    const [hours, minutes] = booking.startTime.split(":").map(Number);
    bookingDateTime.setHours(hours, minutes, 0, 0);

    const now = new Date();
    const hoursUntil = (bookingDateTime.getTime() - now.getTime()) / (1000 * 60 * 60);

    if (hoursUntil < course.cancellationHours) {
      return { error: `Cannot cancel less than ${course.cancellationHours} hours before session` };
    }
  }

  await db.booking.update({
    where: { id: bookingId },
    data: {
      status: "CANCELLED",
      cancelledAt: new Date(),
      cancelReason: reason,
    },
  });

  revalidatePath("/schedule");
  revalidatePath("/admin/schedule");
  return { success: true };
}

export async function getBookingsForCourse(courseId: string) {
  return db.booking.findMany({
    where: { courseId, status: { not: "CANCELLED" } },
    include: {
      student: { select: { id: true, name: true, email: true } },
      attendance: true,
    },
    orderBy: [{ date: "asc" }, { startTime: "asc" }],
  });
}

export async function getBookingsForInstructor(instructorId: string) {
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  return db.booking.findMany({
    where: {
      instructorId,
      date: { gte: today },
      status: { not: "CANCELLED" },
    },
    include: {
      course: { select: { id: true, title: true } },
      student: { select: { id: true, name: true } },
      attendance: true,
    },
    orderBy: [{ date: "asc" }, { startTime: "asc" }],
  });
}

export async function getBookingsForStudent(studentId: string) {
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  return db.booking.findMany({
    where: {
      studentId,
      date: { gte: today },
      status: { not: "CANCELLED" },
    },
    include: {
      course: { select: { id: true, title: true } },
      instructor: { select: { id: true, name: true } },
      attendance: true,
    },
    orderBy: [{ date: "asc" }, { startTime: "asc" }],
  });
}

// ─── Student Self-Booking ───

export async function bookSlotAsStudent(
  courseId: string,
  date: string,
  startTime: string
) {
  const session = await auth();
  if (!session?.user) throw new Error("Not authenticated");
  const role = (session.user as any).role;
  const userId = (session.user as any).id;

  if (role !== "STUDENT") {
    return { error: "Only students can self-book" };
  }

  // Verify course allows student booking
  const course = await db.course.findUnique({ where: { id: courseId } });
  if (!course) return { error: "Course not found" };
  if (!course.studentBookingEnabled) {
    return { error: "Student booking is not enabled for this course" };
  }

  // Verify student is enrolled
  const enrollment = await db.enrollment.findUnique({
    where: { userId_courseId: { userId, courseId } },
  });
  if (!enrollment) return { error: "Not enrolled in this course" };

  // Check max advance days
  const bookingDate = new Date(date);
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const daysAhead = (bookingDate.getTime() - today.getTime()) / (1000 * 60 * 60 * 24);

  if (daysAhead > course.maxAdvanceDays) {
    return { error: `Cannot book more than ${course.maxAdvanceDays} days in advance` };
  }

  // Get available slots
  const slots = await getAvailableSlots(course.instructorId, courseId, bookingDate);
  const slot = slots.find((s) => s.startTime === startTime);

  if (!slot) {
    return { error: "Time slot is not available" };
  }

  // Check for existing booking by student on same date/time
  const existing = await db.booking.findFirst({
    where: {
      studentId: userId,
      date: bookingDate,
      startTime,
      status: { not: "CANCELLED" },
    },
  });

  if (existing) {
    return { error: "You already have a booking at this time" };
  }

  await db.booking.create({
    data: {
      courseId,
      studentId: userId,
      instructorId: course.instructorId,
      date: bookingDate,
      startTime,
      endTime: slot.endTime,
      status: "CONFIRMED",
    },
  });

  revalidatePath("/schedule");
  revalidatePath("/schedule/book");
  return { success: true };
}

// ─── Attendance Actions ───

const attendanceSchema = z.object({
  bookingId: z.string(),
  studentId: z.string(),
  present: z.boolean(),
  notes: z.string().max(500).optional(),
});

export async function markAttendance(formData: FormData) {
  const session = await auth();
  if (!session?.user) throw new Error("Not authenticated");
  const role = (session.user as any).role;
  const userId = (session.user as any).id;

  if (role !== "ADMIN" && role !== "INSTRUCTOR") {
    throw new Error("Not authorized");
  }

  const parsed = attendanceSchema.safeParse({
    bookingId: formData.get("bookingId"),
    studentId: formData.get("studentId"),
    present: formData.get("present") === "true",
    notes: formData.get("notes") || undefined,
  });

  if (!parsed.success) {
    return { error: parsed.error.flatten().fieldErrors };
  }

  const { bookingId, present, notes } = parsed.data;

  // Verify booking exists and instructor has access
  const booking = await db.booking.findUnique({
    where: { id: bookingId },
    include: { course: true },
  });

  if (!booking) return { error: "Booking not found" };
  if (role !== "ADMIN" && booking.course.instructorId !== userId) {
    return { error: "Not authorized" };
  }

  // Check if attendance already recorded
  const existing = await db.attendance.findUnique({
    where: { bookingId },
  });

  if (existing) {
    // Update existing
    await db.attendance.update({
      where: { bookingId },
      data: { present, notes, recordedAt: new Date() },
    });
  } else {
    // Create new
    await db.attendance.create({
      data: {
        bookingId,
        instructorId: userId,
        present,
        notes,
      },
    });
  }

  revalidatePath("/schedule");
  revalidatePath("/admin/schedule");
  return { success: true };
}
