import { auth } from "@/lib/auth";
import { redirect } from "next/navigation";
import { db } from "@/lib/db";
import AdminScheduleClient from "./AdminScheduleClient";

export default async function AdminSchedulePage() {
  const session = await auth();
  if (!session?.user) redirect("/login");

  const role = (session.user as any).role;
  if (role !== "ADMIN") redirect("/dashboard");

  const instructors = await db.user.findMany({
    where: { role: "INSTRUCTOR" },
    select: { id: true, name: true, email: true },
  });

  const courses = await db.course.findMany({
    where: { visibility: "PUBLISHED" },
    include: {
      instructor: { select: { id: true, name: true } },
    },
  });

  const bookings = await db.booking.findMany({
    where: { status: { not: "CANCELLED" } },
    include: {
      course: { select: { id: true, title: true } },
      student: { select: { id: true, name: true, email: true } },
      instructor: { select: { id: true, name: true } },
      attendance: true,
    },
    orderBy: [{ date: "asc" }, { startTime: "asc" }],
  });

  const students = await db.user.findMany({
    where: { role: "STUDENT" },
    select: { id: true, name: true, email: true },
  });

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Schedule Management</h1>
          <p className="text-gray-600">Create and manage sessions across all instructors.</p>
        </div>
      </div>

      <AdminScheduleClient
        instructors={instructors}
        courses={courses}
        bookings={bookings}
        students={students}
      />
    </div>
  );
}
