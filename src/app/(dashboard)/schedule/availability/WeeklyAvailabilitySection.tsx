"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useT } from "@/lib/i18n/useT";
import { removeAvailability } from "@/actions/schedule";

interface Slot {
  id: string;
  dayOfWeek: number;
  startTime: string;
  endTime: string;
  courseId: string | null;
}

interface CourseOption {
  id: string;
  title: string;
}

export default function WeeklyAvailabilitySection({
  availability,
  courses,
  dayLabels,
}: {
  availability: Slot[];
  courses: CourseOption[];
  dayLabels: string[];
}) {
  const router = useRouter();
  const t = useT();
  const [loading, setLoading] = useState(false);

  async function handleRemove(id: string) {
    if (!confirm(t("availability.confirmRemove"))) return;
    setLoading(true);
    await removeAvailability(id);
    setLoading(false);
    router.refresh();
  }

  return (
    <div className="metro-card p-6 mb-8">
      <h2 className="metro-section-title mb-4">
        {t("availability.weeklySchedule").toLowerCase()}
      </h2>
      {availability.length === 0 ? (
        <p className="text-metro-text-secondary">
          {t("availability.noAvailability")}
        </p>
      ) : (
        <div className="space-y-3">
          {dayLabels.map((day, index) => {
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
                          ({courses.find((c) => c.id === slot.courseId)?.title})
                        </span>
                      )}
                      <button
                        onClick={() => handleRemove(slot.id)}
                        disabled={loading}
                        aria-label={t("availability.remove")}
                        className="text-metro-error hover:text-metro-orange-hover font-medium disabled:opacity-50"
                      >
                        ×
                      </button>
                    </span>
                  ))}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
