import { auth } from "@/lib/auth";
import { redirect } from "next/navigation";
import { db } from "@/lib/db";
import AvailabilityForm from "./AvailabilityForm";
import BlockedDatesSection from "./BlockedDatesSection";

const DAYS = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];

export default async function AvailabilityPage() {
  const session = await auth();
  if (!session?.user) redirect("/login");

  const role = (session.user as any).role;
  const userId = (session.user as any).id;

  if (role !== "ADMIN" && role !== "INSTRUCTOR") {
    redirect("/dashboard");
  }

  const availability = await db.availability.findMany({
    where: { userId },
    orderBy: [{ dayOfWeek: "asc" }, { startTime: "asc" }],
  });

  const blockedDates = await db.blockedDate.findMany({
    where: { userId },
    orderBy: { date: "asc" },
  });

  const courses = await db.course.findMany({
    where: { instructorId: userId },
    select: { id: true, title: true },
  });

  return (
    <div className="max-w-4xl mx-auto">
      <h1 className="text-2xl font-bold text-gray-900 mb-6">Availability Settings</h1>
      <p className="text-gray-600 mb-8">
        Set your weekly availability hours. Students can book sessions during these times.
      </p>

      {/* Current Availability */}
      <div className="bg-white rounded-lg border p-6 mb-8">
        <h2 className="text-lg font-semibold text-gray-900 mb-4">Weekly Schedule</h2>

        {availability.length === 0 ? (
          <p className="text-gray-500">No availability set yet. Use the form below to add your hours.</p>
        ) : (
          <div className="space-y-3">
            {DAYS.map((day, index) => {
              const daySlots = availability.filter((a) => a.dayOfWeek === index);
              if (daySlots.length === 0) return null;

              return (
                <div key={day} className="flex items-start gap-4">
                  <span className="w-28 font-medium text-gray-700">{day}</span>
                  <div className="flex flex-wrap gap-2">
                    {daySlots.map((slot) => (
                      <span
                        key={slot.id}
                        className="inline-flex items-center gap-2 bg-blue-50 text-blue-700 px-3 py-1 rounded-full text-sm"
                      >
                        {slot.startTime} - {slot.endTime}
                        {slot.courseId && (
                          <span className="text-blue-500 text-xs">
                            ({courses.find((c) => c.id === slot.courseId)?.title || "Course"})
                          </span>
                        )}
                      </span>
                    ))}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Add Availability Form */}
      <div className="bg-white rounded-lg border p-6 mb-8">
        <h2 className="text-lg font-semibold text-gray-900 mb-4">Add Availability</h2>
        <AvailabilityForm courses={courses} />
      </div>

      {/* Blocked Dates */}
      <BlockedDatesSection blockedDates={blockedDates} />
    </div>
  );
}
