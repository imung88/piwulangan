"use client";

import Link from "next/link";
import { useT } from "@/lib/i18n/useT";
import {
  SessionItem,
  STATUS_COLORS,
  statusLabel,
  courseColor,
  formatDateStr,
  toDateStr,
  todayStr,
} from "./types";

interface Props {
  sessions: SessionItem[];
  weekStart: Date;
  onWeekStartChange: (d: Date) => void;
  showCourse?: boolean;
  showAttendees?: boolean;
}

function mondayOf(d: Date) {
  const copy = new Date(d);
  copy.setHours(0, 0, 0, 0);
  const day = copy.getDay();
  copy.setDate(copy.getDate() - ((day + 6) % 7));
  return copy;
}

export default function WeekCalendar({
  sessions,
  weekStart,
  onWeekStartChange,
  showCourse = true,
  showAttendees = false,
}: Props) {
  const today = todayStr();
  const t = useT();

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
    list.sort((a, b) => a.startTime.localeCompare(b.startTime)),
  );

  function shiftWeek(weeks: number) {
    const d = new Date(weekStart);
    d.setDate(d.getDate() + weeks * 7);
    onWeekStartChange(d);
  }

  const weekEnd = new Date(weekStart);
  weekEnd.setDate(weekEnd.getDate() + 6);
  const rangeLabel = `${weekStart.toLocaleDateString(undefined, { month: "short", day: "numeric" })} – ${weekEnd.toLocaleDateString(undefined, { month: "short", day: "numeric", year: "numeric" })}`;

  const emptyWeek = days.every((d) => !(byDay.get(toDateStr(d)) || []).length);

  return (
    <div>
      <div className="flex items-center justify-between mb-3">
        <span className="text-sm font-medium text-metro-text">{rangeLabel}</span>
        <div className="flex gap-1">
          <button
            onClick={() => shiftWeek(-1)}
            className="border border-metro-border px-2.5 py-1 text-sm text-metro-text-secondary hover:bg-metro-bg"
          >
            ←
          </button>
          <button
            onClick={() => onWeekStartChange(mondayOf(new Date()))}
            className="border border-metro-border px-2.5 py-1 text-sm text-metro-text-secondary hover:bg-metro-bg"
          >
            {t("scheduleView.today")}
          </button>
          <button
            onClick={() => shiftWeek(1)}
            className="border border-metro-border px-2.5 py-1 text-sm text-metro-text-secondary hover:bg-metro-bg"
          >
            →
          </button>
        </div>
      </div>

      {/* Desktop: 7-column grid */}
      <div className="hidden md:grid grid-cols-7 gap-2">
        {days.map((d) => {
          const key = toDateStr(d);
          const daySessions = byDay.get(key) || [];
          const isToday = key === today;
          return (
            <div
              key={key}
              className={`border bg-metro-surface min-h-[140px] ${
                isToday ? "border-2 border-metro-blue" : "border-metro-border"
              }`}
            >
              <div
                className={`px-2 py-1.5 border-b border-metro-border text-xs font-medium ${
                  isToday ? "text-metro-blue" : "text-metro-text-secondary"
                }`}
              >
                {d.toLocaleDateString(undefined, { weekday: "short" })}{" "}
                {d.getDate()}
              </div>
              <div className="p-1.5 space-y-1.5">
                {daySessions.map((s) => (
                  <Link
                    key={s.id}
                    href={`/courses/${s.course.id}/schedule/${s.id}`}
                    className={`block border px-1.5 py-1 text-xs ${courseColor(s.course.id)} ${
                      s.status === "CANCELLED" ? "opacity-50 line-through" : ""
                    }`}
                  >
                    <div className="font-medium truncate">{s.title}</div>
                    <div className="truncate">
                      {s.startTime}
                      {showCourse && <> · {s.course.title}</>}
                    </div>
                    {showAttendees && s.attendeeNames.length > 0 && (
                      <div className="truncate opacity-80">
                        {s.attendeeNames.length}
                      </div>
                    )}
                  </Link>
                ))}
              </div>
            </div>
          );
        })}
      </div>
      {emptyWeek && (
        <p className="hidden md:block text-sm text-metro-text-secondary text-center py-6">
          {t("scheduleView.noSessionsThisWeek")}
        </p>
      )}

      {/* Mobile: stacked days */}
      <div className="md:hidden space-y-3">
        {days.map((d) => {
          const key = toDateStr(d);
          const daySessions = byDay.get(key) || [];
          if (daySessions.length === 0) return null;
          return (
            <div key={key} className="border border-metro-border bg-metro-surface">
              <div className="px-3 py-2 border-b border-metro-border text-sm font-medium text-metro-text">
                {formatDateStr(key)}
                {key === today && (
                  <span className="ml-2 metro-badge bg-metro-blue text-white">
                    {t("scheduleView.today")}
                  </span>
                )}
              </div>
              <div className="divide-y divide-metro-border">
                {daySessions.map((s) => (
                  <Link
                    key={s.id}
                    href={`/courses/${s.course.id}/schedule/${s.id}`}
                    className="flex items-center justify-between px-3 py-2"
                  >
                    <div>
                      <div className="text-sm font-medium text-metro-text">
                        {s.title}
                      </div>
                      <div className="text-xs text-metro-text-secondary">
                        {s.startTime}–{s.endTime}
                        {showCourse && <> · {s.course.title}</>}
                      </div>
                    </div>
                    <span
                      className={`metro-badge ${STATUS_COLORS[s.status] || ""}`}
                    >
                      {statusLabel(s.status, t)}
                    </span>
                  </Link>
                ))}
              </div>
            </div>
          );
        })}
        {emptyWeek && (
          <p className="text-sm text-metro-text-secondary text-center py-6">
            {t("scheduleView.noSessionsThisWeek")}
          </p>
        )}
      </div>
    </div>
  );
}
