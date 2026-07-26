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
      <div className="flex gap-1 mb-4 bg-metro-bg p-1 w-fit">
        {(["list", "calendar"] as const).map((v) => (
          <button
            key={v}
            onClick={() => setView(v)}
            className={`px-3 py-1.5 text-sm font-medium transition-colors ${
              view === v
                ? "bg-metro-blue text-white"
                : "text-metro-text-secondary hover:text-metro-text"
            }`}
          >
            {v === "list" ? "list" : "calendar"}
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
