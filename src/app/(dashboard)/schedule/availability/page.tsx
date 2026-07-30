import { auth } from "@/lib/auth";
import { redirect } from "next/navigation";
import { db } from "@/lib/db";
import AvailabilityForm from "./AvailabilityForm";
import BlockedDatesSection from "./BlockedDatesSection";
import WeeklyAvailabilitySection from "./WeeklyAvailabilitySection";
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
      <WeeklyAvailabilitySection
        availability={availability.map((a) => ({
          id: a.id,
          dayOfWeek: a.dayOfWeek,
          startTime: a.startTime,
          endTime: a.endTime,
          courseId: a.courseId,
        }))}
        courses={courses}
        dayLabels={labels.days}
      />

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
