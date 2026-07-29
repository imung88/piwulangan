import { auth } from "@/lib/auth";
import { redirect } from "next/navigation";
import { db } from "@/lib/db";
import { DAY_NAMES } from "@/lib/schedule";
import AvailabilityForm from "./AvailabilityForm";
import BlockedDatesSection from "./BlockedDatesSection";
import { getServerT } from "@/lib/i18n/serverT";

const DAY_KEYS = ["sunday", "monday", "tuesday", "wednesday", "thursday", "friday", "saturday"] as const;

export default async function AvailabilityPage() {
  const t = await getServerT();
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

  const labels = {
    title: t("availability.title"),
    description: t("availability.description"),
    weeklySchedule: t("availability.weeklySchedule"),
    addAvailability: t("availability.addAvailability"),
    noAvailability: t("availability.noAvailability"),
    courseFallback: t("settings.inviteCode"),
    days: DAY_KEYS.map((k) => t(`days.${k}`)),
  };

  return (
    <div className="max-w-4xl mx-auto">
      <h1 className="metro-page-title mb-6">{labels.title}</h1>
      <p className="text-metro-text-secondary mb-8">{labels.description}</p>

      {/* Current Availability */}
      <div className="metro-card p-6 mb-8">
        <h2 className="metro-section-title mb-4">{labels.weeklySchedule.toLowerCase()}</h2>
        {availability.length === 0 ? (
          <p className="text-metro-text-secondary">{labels.noAvailability}</p>
        ) : (
          <div className="space-y-3">
            {labels.days.map((day, index) => {
              const daySlots = availability.filter((a) => a.dayOfWeek === index);
              if (daySlots.length === 0) return null;

              return (
                <div key={day} className="flex items-start gap-4">
                  <span className="w-28 font-medium text-metro-text">{day}</span>
                  <div className="flex flex-wrap gap-2">
                    {daySlots.map((slot) => (
                      <span
                        key={slot.id}
                        className="inline-flex items-center gap-2 bg-metro-blue-light text-metro-blue px-3 py-1 text-sm"
                      >
                        {slot.startTime} - {slot.endTime}
                        {slot.courseId && (
                          <span className="text-metro-chrome-dark text-xs">
                            ({courses.find((c) => c.id === slot.courseId)?.title || DAY_NAMES[index]})
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
      <div className="metro-card p-6 mb-8">
        <h2 className="metro-section-title mb-4">{labels.addAvailability.toLowerCase()}</h2>
        <AvailabilityForm courses={courses} />
      </div>

      {/* Blocked Dates */}
      <BlockedDatesSection blockedDates={blockedDates} />
    </div>
  );
}
