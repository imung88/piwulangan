"use client";

import { useState } from "react";
import { SessionItem } from "./types";
import { useT } from "@/lib/i18n/useT";
import SessionList from "./SessionList";
import WeekCalendar from "./WeekCalendar";

interface Props {
  sessions: SessionItem[];
  showCourse?: boolean;
  showAttendees?: boolean;
  showInstructor?: boolean;
}

function mondayOf(d: Date) {
  const copy = new Date(d);
  copy.setHours(0, 0, 0, 0);
  const day = copy.getDay();
  copy.setDate(copy.getDate() - ((day + 6) % 7));
  return copy;
}

export default function ScheduleView({
  sessions,
  showCourse,
  showAttendees,
  showInstructor,
}: Props) {
  const [view, setView] = useState<"list" | "calendar">("list");
  const [filter, setFilter] = useState<"upcoming" | "past" | "all">("upcoming");
  const [weekStart, setWeekStart] = useState(() => mondayOf(new Date()));
  const t = useT();

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
            {t(`scheduleView.${v}`)}
          </button>
        ))}
      </div>
      {view === "list" ? (
        <SessionList
          sessions={sessions}
          filter={filter}
          onFilterChange={setFilter}
          showCourse={showCourse}
          showAttendees={showAttendees}
          showInstructor={showInstructor}
        />
      ) : (
        <WeekCalendar
          sessions={sessions}
          weekStart={weekStart}
          onWeekStartChange={setWeekStart}
          showCourse={showCourse}
          showAttendees={showAttendees}
        />
      )}
    </div>
  );
}
