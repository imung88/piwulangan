"use client";

import { DAY_NAMES } from "@/lib/schedule";
import { useT, useDayNames, format } from "@/lib/i18n/useT";

interface AvailabilityWindow {
  id: string;
  dayOfWeek: number;
  startTime: string;
  endTime: string;
}

export default function AvailabilityDisplay({
  windows,
  instructorName,
}: {
  windows: AvailabilityWindow[];
  instructorName: string;
}) {
  const t = useT();
  const dayNames = useDayNames();

  if (windows.length === 0) {
    return (
      <p className="text-sm text-metro-text-secondary">
        {format(t("availability.hasNoAvailability"), { name: instructorName })}
      </p>
    );
  }

  const byDay = new Map<number, AvailabilityWindow[]>();
  for (const w of windows) {
    if (!byDay.has(w.dayOfWeek)) byDay.set(w.dayOfWeek, []);
    byDay.get(w.dayOfWeek)!.push(w);
  }

  // Monday-first ordering to match the week calendar.
  const mondayFirst = (day: number) => (day + 6) % 7;

  return (
    <div className="metro-card">
      <p className="text-sm text-metro-text-secondary mb-3">
        {format(t("availability.generalAvailability"), { name: instructorName })}
      </p>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
        {Array.from(byDay.entries())
          .sort(([a], [b]) => mondayFirst(a) - mondayFirst(b))
          .map(([day, wins]) => (
            <div
              key={day}
              className="flex items-center justify-between bg-metro-bg px-3 py-2 text-sm"
            >
              <span className="font-medium text-metro-text">
                {dayNames[day] ?? DAY_NAMES[day]}
              </span>
              <span className="text-metro-text-secondary">
                {wins.map((w) => `${w.startTime}–${w.endTime}`).join(", ")}
              </span>
            </div>
          ))}
      </div>
    </div>
  );
}
