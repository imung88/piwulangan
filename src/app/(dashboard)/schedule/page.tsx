import { auth } from "@/lib/auth";
import { redirect } from "next/navigation";
import { db } from "@/lib/db";
import { getBookingsForInstructor, getBookingsForStudent } from "@/lib/schedule";
import ScheduleClient from "./ScheduleClient";

export default async function SchedulePage() {
  const session = await auth();
  if (!session?.user) redirect("/login");

  const role = (session.user as any).role;
  const userId = (session.user as any).id;

  // Admin: show all sessions across all instructors
  if (role === "ADMIN") {
    const bookings = await db.booking.findMany({
      where: { status: { not: "CANCELLED" } },
      include: {
        course: { select: { id: true, title: true } },
        student: { select: { id: true, name: true } },
        instructor: { select: { id: true, name: true } },
        attendance: true,
      },
      orderBy: [{ date: "asc" }, { startTime: "asc" }],
    });

    return (
      <div>
        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Schedule</h1>
            <p className="text-gray-600">All sessions across all instructors.</p>
          </div>
          <a
            href="/admin/schedule"
            className="text-sm text-blue-600 hover:text-blue-700 font-medium"
          >
            Manage Sessions
          </a>
        </div>

        <ScheduleClient bookings={bookings} role="ADMIN" />
      </div>
    );
  }

  // Guardian: get linked student's bookings
  if (role === "GUARDIAN") {
    const links = await db.guardianStudent.findMany({
      where: { guardianId: userId },
      select: { studentId: true },
    });

    const studentIds = links.map((l) => l.studentId);
    const bookings = [];

    for (const studentId of studentIds) {
      const studentBookings = await db.booking.findMany({
        where: {
          studentId,
          status: { not: "CANCELLED" },
        },
        include: {
          course: { select: { id: true, title: true } },
          instructor: { select: { id: true, name: true } },
          attendance: true,
        },
        orderBy: [{ date: "asc" }, { startTime: "asc" }],
        take: 20,
      });
      bookings.push(...studentBookings);
    }

    const students = await db.user.findMany({
      where: { id: { in: studentIds } },
      select: { id: true, name: true },
    });

    return (
      <div>
        <h1 className="text-2xl font-bold text-gray-900 mb-2">Schedule</h1>
        <p className="text-gray-600 mb-6">View your linked students&apos; upcoming sessions.</p>

        {students.length > 0 && (
          <div className="mb-6">
            <h2 className="text-sm font-medium text-gray-500 uppercase tracking-wide mb-2">
              Linked Students
            </h2>
            <div className="flex gap-2">
              {students.map((s) => (
                <span key={s.id} className="bg-purple-100 text-purple-700 px-3 py-1 rounded-full text-sm">
                  {s.name}
                </span>
              ))}
            </div>
          </div>
        )}

        <ScheduleClient bookings={bookings} role="GUARDIAN" />
      </div>
    );
  }

  // Instructor
  if (role === "INSTRUCTOR") {
    const bookings = await getBookingsForInstructor(userId);

    return (
      <div>
        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Schedule</h1>
            <p className="text-gray-600">Your upcoming sessions.</p>
          </div>
          <a
            href="/schedule/availability"
            className="text-sm text-blue-600 hover:text-blue-700 font-medium"
          >
            Set Availability
          </a>
        </div>

        <ScheduleClient bookings={bookings} role="INSTRUCTOR" />
      </div>
    );
  }

  // Student
  const bookings = await getBookingsForStudent(userId);

  const coursesWithBooking = await db.course.findMany({
    where: {
      studentBookingEnabled: true,
      enrollments: { some: { userId } },
    },
    select: { id: true, title: true },
  });

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Schedule</h1>
          <p className="text-gray-600">Your upcoming sessions.</p>
        </div>
        {coursesWithBooking.length > 0 && (
          <a
            href="/schedule/book"
            className="bg-blue-600 text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-blue-700"
          >
            Book a Session
          </a>
        )}
      </div>

      <ScheduleClient bookings={bookings} role="STUDENT" />
    </div>
  );
}
