"use client";

import { useState } from "react";
import Link from "next/link";
import {
  SessionItem,
  STATUS_COLORS,
  courseColor,
  formatDateStr,
  todayStr,
} from "./types";

interface Props {
  sessions: SessionItem[];
}

function dateKey(d: Date) {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

function mondayOf(d: Date) {
  const copy = new Date(d);
  copy.setHours(0, 0, 0, 0);
  const day = copy.getDay();
  copy.setDate(copy.getDate() - ((day + 6) % 7));
  return copy;
}

export default function WeekCalendar({ sessions }: Props) {
  const [weekStart, setWeekStart] = useState(() => mondayOf(new Date()));
  const today = todayStr();

  const days = Array.from({ length: 7 }, (_, i) => {
    const d = new Date(weekStart);
    d.setDate(d.getDate() + i);
    return d;
  });

  const byDay = new Map<string, SessionItem[]>();
  for (const s of sessions) {
    const key = s.date;
    if (!byDay.has(key)) byDay.set(key, []);
    byDay.get(key)!.push(s);
  }
  byDay.forEach((list) =>
    list.sort((a, b) => a.startTime.localeCompare(b.startTime))
  );

  function shiftWeek(weeks: number) {
    const d = new Date(weekStart);
    d.setDate(d.getDate() + weeks * 7);
    setWeekStart(d);
  }

  const weekEnd = new Date(weekStart);
  weekEnd.setDate(weekEnd.getDate() + 6);

  const rangeLabel = `${weekStart.toLocaleDateString("en-US", { month: "short", day: "numeric" })} – ${weekEnd.toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })}`;

  return (
    <div>
      <div className="flex items-center justify-between mb-3">
        <span className="text-sm font-medium text-gray-700">{rangeLabel}</span>
        <div className="flex gap-1">
          <button
            onClick={() => shiftWeek(-1)}
            className="rounded-md border px-2.5 py-1 text-sm text-gray-600 hover:bg-gray-50"
          >
            ←
          </button>
          <button
            onClick={() => setWeekStart(mondayOf(new Date()))}
            className="rounded-md border px-2.5 py-1 text-sm text-gray-600 hover:bg-gray-50"
          >
            Today
          </button>
          <button
            onClick={() => shiftWeek(1)}
            className="rounded-md border px-2.5 py-1 text-sm text-gray-600 hover:bg-gray-50"
          >
            →
          </button>
        </div>
      </div>

      {/* Desktop: 7-column grid */}
      <div className="hidden md:grid grid-cols-7 gap-2">
        {days.map((d) => {
          const key = dateKey(d);
          const daySessions = byDay.get(key) || [];
          const isToday = key === today;
          return (
            <div
              key={key}
              className={`rounded-lg border bg-white min-h-[140px] ${
                isToday ? "ring-2 ring-blue-500" : ""
              }`}
            >
              <div
                className={`px-2 py-1.5 border-b text-xs font-medium ${
                  isToday ? "text-blue-700" : "text-gray-500"
                }`}
              >
                {d.toLocaleDateString("en-US", { weekday: "short" })}{" "}
                {d.getDate()}
              </div>
              <div className="p-1.5 space-y-1.5">
                {daySessions.map((s) => (
                  <Link
                    key={s.id}
                    href={`/courses/${s.course.id}/schedule`}
                    className={`block rounded border px-1.5 py-1 text-xs ${courseColor(s.course.id)} ${
                      s.status === "CANCELLED" ? "opacity-50 line-through" : ""
                    }`}
                  >
                    <div className="font-medium truncate">{s.title}</div>
                    <div className="truncate">{s.startTime} · {s.course.title}</div>
                  </Link>
                ))}
              </div>
            </div>
          );
        })}
      </div>

      {/* Mobile: stacked days */}
      <div className="md:hidden space-y-3">
        {days.map((d) => {
          const key = dateKey(d);
          const daySessions = byDay.get(key) || [];
          if (daySessions.length === 0) return null;
          return (
            <div key={key} className="rounded-lg border bg-white">
              <div className="px-3 py-2 border-b text-sm font-medium text-gray-700">
                {formatDateStr(key)}
                {key === today && (
                  <span className="ml-2 text-xs bg-blue-100 text-blue-700 px-2 py-0.5 rounded-full">
                    Today
                  </span>
                )}
              </div>
              <div className="divide-y">
                {daySessions.map((s) => (
                  <Link
                    key={s.id}
                    href={`/courses/${s.course.id}/schedule`}
                    className="flex items-center justify-between px-3 py-2"
                  >
                    <div>
                      <div className="text-sm font-medium text-gray-900">
                        {s.title}
                      </div>
                      <div className="text-xs text-gray-500">
                        {s.startTime}–{s.endTime} · {s.course.title}
                      </div>
                    </div>
                    <span
                      className={`text-xs px-2 py-0.5 rounded-full ${STATUS_COLORS[s.status] || ""}`}
                    >
                      {s.status}
                    </span>
                  </Link>
                ))}
              </div>
            </div>
          );
        })}
        {days.every((d) => !(byDay.get(dateKey(d)) || []).length) && (
          <p className="text-sm text-gray-500 text-center py-6">
            No sessions this week.
          </p>
        )}
      </div>
    </div>
  );
}
