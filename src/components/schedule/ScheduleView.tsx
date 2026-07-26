"use client";

import { useState } from "react";
import { SessionItem } from "./types";
import SessionList from "./SessionList";
import WeekCalendar from "./WeekCalendar";

interface Props {
  sessions: SessionItem[];
  showCourse?: boolean;
  showAttendees?: boolean;
  showInstructor?: boolean;
}

export default function ScheduleView({
  sessions,
  showCourse,
  showAttendees,
  showInstructor,
}: Props) {
  const [view, setView] = useState<"list" | "calendar">("list");

  return (
    <div>
      <div className="flex gap-1 mb-4 bg-gray-100 p-1 rounded-lg w-fit">
        {(["list", "calendar"] as const).map((v) => (
          <button
            key={v}
            onClick={() => setView(v)}
            className={`px-3 py-1.5 text-sm font-medium rounded-md transition-colors ${
              view === v
                ? "bg-white text-gray-900 shadow"
                : "text-gray-600 hover:text-gray-900"
            }`}
          >
            {v === "list" ? "☰ List" : "📅 Calendar"}
          </button>
        ))}
      </div>

      {view === "list" ? (
        <SessionList
          sessions={sessions}
          showCourse={showCourse}
          showAttendees={showAttendees}
          showInstructor={showInstructor}
        />
      ) : (
        <WeekCalendar sessions={sessions} />
      )}
    </div>
  );
}
