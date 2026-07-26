import { auth } from "@/lib/auth";
import { redirect } from "next/navigation";
import { db } from "@/lib/db";
import BookingClient from "./BookingClient";

export default async function BookPage() {
  const session = await auth();
  if (!session?.user) redirect("/login");

  const role = (session.user as any).role;
  const userId = (session.user as any).id;

  if (role !== "STUDENT") {
    redirect("/schedule");
  }

  // Get courses that allow student booking and student is enrolled in
  const courses = await db.course.findMany({
    where: {
      studentBookingEnabled: true,
      visibility: "PUBLISHED",
      enrollments: { some: { userId } },
    },
    select: {
      id: true,
      title: true,
      instructorId: true,
      slotDuration: true,
      bufferTime: true,
      maxAdvanceDays: true,
      instructor: { select: { id: true, name: true } },
    },
  });

  // Get student's existing bookings
  const existingBookings = await db.booking.findMany({
    where: {
      studentId: userId,
      status: { not: "CANCELLED" },
    },
    select: {
      date: true,
      startTime: true,
      courseId: true,
    },
  });

  return (
    <div className="max-w-4xl mx-auto">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-900">Book a Session</h1>
        <p className="text-gray-600">
          Select a course, pick a date, and choose an available time slot.
        </p>
      </div>

      {courses.length === 0 ? (
        <div className="bg-white rounded-lg border p-8 text-center">
          <p className="text-gray-500">
            No courses available for booking. Ask your instructor to enable student booking.
          </p>
        </div>
      ) : (
        <BookingClient courses={courses} existingBookings={existingBookings} />
      )}
    </div>
  );
}
