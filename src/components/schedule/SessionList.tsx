"use client";

import { useState } from "react";
import Link from "next/link";
import {
  SessionItem,
  STATUS_COLORS,
  ATTENDANCE_COLORS,
  formatDateStr,
  todayStr,
} from "./types";

interface Props {
  sessions: SessionItem[];
  showCourse?: boolean;
  showAttendees?: boolean;
  showInstructor?: boolean;
}

export default function SessionList({
  sessions,
  showCourse = true,
  showAttendees = false,
  showInstructor = false,
}: Props) {
  const [filter, setFilter] = useState<"upcoming" | "past" | "all">("upcoming");
  const today = todayStr();

  const filtered = sessions.filter((s) => {
    if (filter === "upcoming") return s.date >= today;
    if (filter === "past") return s.date < today;
    return true;
  });

  if (sessions.length === 0) {
    return (
      <div className="bg-white rounded-lg border p-8 text-center">
        <p className="text-gray-500">No sessions scheduled yet.</p>
      </div>
    );
  }

  return (
    <div>
      <div className="flex gap-1 mb-4 bg-gray-100 p-1 rounded-lg w-fit">
        {(["upcoming", "past", "all"] as const).map((f) => (
          <button
            key={f}
            onClick={() => setFilter(f)}
            className={`px-3 py-1.5 text-sm font-medium rounded-md transition-colors ${
              filter === f
                ? "bg-white text-gray-900 shadow"
                : "text-gray-600 hover:text-gray-900"
            }`}
          >
            {f.charAt(0).toUpperCase() + f.slice(1)}
          </button>
        ))}
      </div>

      <div className="space-y-3">
        {filtered.length === 0 && (
          <div className="bg-white rounded-lg border p-6 text-center text-sm text-gray-500">
            No {filter} sessions.
          </div>
        )}
        {filtered.map((s) => (
          <div
            key={s.id}
            className={`bg-white rounded-lg border p-4 ${
              s.date === today && s.status !== "CANCELLED"
                ? "ring-2 ring-blue-500"
                : ""
            }`}
          >
            <div className="flex items-center gap-3 mb-1 flex-wrap">
              <span className="font-semibold text-gray-900">{s.title}</span>
              <span
                className={`text-xs px-2 py-0.5 rounded-full ${STATUS_COLORS[s.status] || ""}`}
              >
                {s.status}
              </span>
              {s.date === today && s.status !== "CANCELLED" && (
                <span className="text-xs bg-blue-100 text-blue-700 px-2 py-0.5 rounded-full font-medium">
                  Today
                </span>
              )}
            </div>

            <div className="text-sm text-gray-600">
              <span>{formatDateStr(s.date)}</span>
              <span className="mx-2">·</span>
              <span>
                {s.startTime} – {s.endTime}
              </span>
              {s.location && (
                <>
                  <span className="mx-2">·</span>
                  {s.location.startsWith("http") ? (
                    <a
                      href={s.location}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-blue-600 hover:underline"
                    >
                      Join link
                    </a>
                  ) : (
                    <span>{s.location}</span>
                  )}
                </>
              )}
            </div>

            {showCourse && (
              <div className="text-sm text-gray-500 mt-1">
                <Link
                  href={`/courses/${s.course.id}`}
                  className="hover:text-blue-600 hover:underline"
                >
                  {s.course.title}
                </Link>
                {showInstructor && s.instructor && (
                  <span> · {s.instructor.name}</span>
                )}
              </div>
            )}

            {s.lesson && (
              <div className="text-sm mt-1">
                <Link
                  href={`/courses/${s.course.id}/lessons/${s.lesson.id}`}
                  className="text-blue-600 hover:underline"
                >
                  📖 {s.lesson.title}
                </Link>
              </div>
            )}

            {showAttendees && s.attendeeNames.length > 0 && (
              <div className="text-sm text-gray-500 mt-1">
                👥 {s.attendeeNames.join(", ")}
              </div>
            )}

            {s.myAttendance && (
              <div className="text-sm mt-1">
                <span className={ATTENDANCE_COLORS[s.myAttendance] || ""}>
                  {s.myAttendance.charAt(0) +
                    s.myAttendance.slice(1).toLowerCase()}
                </span>
              </div>
            )}

            {s.status === "CANCELLED" && s.cancelReason && (
              <div className="text-sm text-gray-400 mt-1">
                Reason: {s.cancelReason}
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}
