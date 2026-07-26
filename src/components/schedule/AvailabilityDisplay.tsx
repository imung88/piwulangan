import { DAY_NAMES } from "@/lib/schedule";

interface Window {
  id: string;
  dayOfWeek: number;
  startTime: string;
  endTime: string;
}

export default function AvailabilityDisplay({
  windows,
  instructorName,
}: {
  windows: Window[];
  instructorName: string;
}) {
  if (windows.length === 0) {
    return (
      <p className="text-sm text-metro-text-secondary">
        {instructorName} has not published availability yet.
      </p>
    );
  }

  const byDay = new Map<number, Window[]>();
  for (const w of windows) {
    if (!byDay.has(w.dayOfWeek)) byDay.set(w.dayOfWeek, []);
    byDay.get(w.dayOfWeek)!.push(w);
  }

  return (
    <div className="metro-card">
      <p className="text-sm text-metro-text-secondary mb-3">
        No sessions have been assigned to you yet. {instructorName} is
        generally available at these times — sessions are scheduled by the
        instructor:
      </p>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
        {Array.from(byDay.entries())
          .sort(([a], [b]) => a - b)
          .map(([day, wins]) => (
            <div
              key={day}
              className="flex items-center justify-between bg-metro-bg px-3 py-2 text-sm"
            >
              <span className="font-medium text-metro-text">
                {DAY_NAMES[day]}
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
