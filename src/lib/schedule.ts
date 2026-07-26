import { db } from "./db";

export interface TimeSlot {
  startTime: string;
  endTime: string;
}

/**
 * Get available time slots for an instructor on a specific date.
 *
 * Algorithm:
 * 1. Get instructor availability for the day of week
 * 2. Check if date is blocked
 * 3. Generate time slots based on slotDuration + bufferTime
 * 4. Subtract already-booked slots
 * 5. Return available slots
 */
export async function getAvailableSlots(
  instructorId: string,
  courseId: string,
  date: Date
): Promise<TimeSlot[]> {
  const dayOfWeek = date.getDay();

  // 1. Get instructor availability for this day of week
  const availability = await db.availability.findMany({
    where: {
      userId: instructorId,
      dayOfWeek,
      active: true,
      OR: [
        { courseId: null }, // General availability
        { courseId }, // Course-specific availability
      ],
    },
  });

  if (availability.length === 0) return [];

  // 2. Check if date is blocked
  const dateStr = date.toISOString().split("T")[0];
  const blocked = await db.blockedDate.findFirst({
    where: {
      userId: instructorId,
      date: new Date(dateStr),
    },
  });

  if (blocked) return [];

  // 3. Get course settings
  const course = await db.course.findUnique({
    where: { id: courseId },
    select: { slotDuration: true, bufferTime: true },
  });

  if (!course) return [];

  const slotDuration = course.slotDuration; // minutes
  const bufferTime = course.bufferTime; // minutes
  const slotInterval = slotDuration + bufferTime;

  // 4. Generate all possible slots from availability windows
  const possibleSlots: TimeSlot[] = [];

  for (const avail of availability) {
    const [startHour, startMin] = avail.startTime.split(":").map(Number);
    const [endHour, endMin] = avail.endTime.split(":").map(Number);

    const startMinutes = startHour * 60 + startMin;
    const endMinutes = endHour * 60 + endMin;

    for (let m = startMinutes; m + slotDuration <= endMinutes; m += slotInterval) {
      const slotStart = m;
      const slotEnd = m + slotDuration;

      const startTime = formatTime(slotStart);
      const endTime = formatTime(slotEnd);

      possibleSlots.push({ startTime, endTime });
    }
  }

  // 5. Subtract already-booked slots for this instructor on this date
  const existingBookings = await db.booking.findMany({
    where: {
      instructorId,
      date: new Date(dateStr),
      status: { not: "CANCELLED" },
    },
    select: { startTime: true, endTime: true },
  });

  const available = possibleSlots.filter((slot) => {
    return !existingBookings.some(
      (booking) =>
        booking.startTime < slot.endTime && booking.endTime > slot.startTime
    );
  });

  return available;
}

function formatTime(totalMinutes: number): string {
  const hours = Math.floor(totalMinutes / 60);
  const minutes = totalMinutes % 60;
  return `${hours.toString().padStart(2, "0")}:${minutes.toString().padStart(2, "0")}`;
}

/**
 * Check if a specific time slot is available for an instructor.
 */
export async function isSlotAvailable(
  instructorId: string,
  courseId: string,
  date: Date,
  startTime: string,
  endTime: string
): Promise<boolean> {
  const slots = await getAvailableSlots(instructorId, courseId, date);
  return slots.some(
    (slot) => slot.startTime === startTime && slot.endTime === endTime
  );
}

/**
 * Get upcoming bookings for a user (instructor, student, or guardian view).
 */
export async function getUpcomingBookings(
  userId: string,
  role: string,
  limit = 5
) {
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const where =
    role === "INSTRUCTOR"
      ? { instructorId: userId, date: { gte: today }, status: { not: "CANCELLED" as const } }
      : { studentId: userId, date: { gte: today }, status: { not: "CANCELLED" as const } };

  return db.booking.findMany({
    where,
    include: {
      course: { select: { id: true, title: true } },
      student: { select: { id: true, name: true } },
      attendance: true,
    },
    orderBy: [{ date: "asc" }, { startTime: "asc" }],
    take: limit,
  });
}

/**
 * Get all upcoming bookings for an instructor.
 */
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

/**
 * Get all upcoming bookings for a student.
 */
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
