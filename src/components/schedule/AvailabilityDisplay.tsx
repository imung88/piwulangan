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
      <p className="text-sm text-gray-500">
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
    <div className="rounded-lg border bg-white p-4">
      <p className="text-sm text-gray-600 mb-3">
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
              className="flex items-center justify-between rounded-md bg-gray-50 px-3 py-2 text-sm"
            >
              <span className="font-medium text-gray-700">
                {DAY_NAMES[day]}
              </span>
              <span className="text-gray-600">
                {wins.map((w) => `${w.startTime}–${w.endTime}`).join(", ")}
              </span>
            </div>
          ))}
      </div>
    </div>
  );
}
