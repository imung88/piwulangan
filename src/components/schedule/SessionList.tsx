"use client";

import { useState } from "react";
import Link from "next/link";
import { format as i18nFormat } from "@/lib/i18n/useT";
import { useT } from "@/lib/i18n/useT";
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

const FILTER_LABELS: Record<"upcoming" | "past" | "all", string> = {
  upcoming: "schedule.upcoming",
  past: "schedule.past",
  all: "schedule.all",
};

export default function SessionList({
  sessions,
  showCourse = true,
  showAttendees = false,
  showInstructor = false,
}: Props) {
  const [filter, setFilter] = useState<"upcoming" | "past" | "all">("upcoming");
  const today = todayStr();
  const t = useT();

  const filtered = sessions.filter((s) => {
    if (filter === "upcoming") return s.date >= today;
    if (filter === "past") return s.date < today;
    return true;
  });

  if (sessions.length === 0) {
    return (
      <div className="metro-card p-8 text-center">
        <p className="text-metro-text-secondary">{t("scheduleView.noSessionsYet")}</p>
      </div>
    );
  }

  return (
    <div>
      <div className="flex gap-1 mb-4 bg-metro-bg p-1 w-fit">
        {(["upcoming", "past", "all"] as const).map((f) => (
          <button
            key={f}
            onClick={() => setFilter(f)}
            className={`px-3 py-1.5 text-sm font-medium transition-colors ${
              filter === f
                ? "bg-metro-blue text-white"
                : "text-metro-text-secondary hover:text-metro-text"
            }`}
          >
            {t(FILTER_LABELS[f])}
          </button>
        ))}
      </div>
      <div className="space-y-3">
        {filtered.length === 0 && (
          <div className="metro-card p-6 text-center text-sm text-metro-text-secondary">
            {i18nFormat(t("scheduleView.noSessionsFiltered"), { filter: t(FILTER_LABELS[filter]) })}
          </div>
        )}
        {filtered.map((s) => (
          <div
            key={s.id}
            className={`metro-card ${
              s.date === today && s.status !== "CANCELLED"
                ? "metro-card-accent"
                : ""
            }`}
          >
            <div className="flex items-center gap-3 mb-1 flex-wrap">
              <span className="font-semibold text-metro-text">{s.title}</span>
              <span
                className={`metro-badge ${STATUS_COLORS[s.status] || ""}`}
              >
                {s.status}
              </span>
              {s.date === today && s.status !== "CANCELLED" && (
                <span className="metro-badge bg-metro-blue text-white">
                  {t("scheduleView.today")}
                </span>
              )}
            </div>
            <div className="text-sm text-metro-text-secondary">
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
                      className="text-metro-blue hover:underline"
                    >
                      {t("scheduleView.joinLink")}
                    </a>
                  ) : (
                    <span>{s.location}</span>
                  )}
                </>
              )}
            </div>
            {showCourse && (
              <div className="text-sm text-metro-text-secondary mt-1">
                <Link
                  href={`/courses/${s.course.id}`}
                  className="hover:text-metro-blue hover:underline"
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
                  className="text-metro-blue hover:underline"
                >
                  {s.lesson.title}
                </Link>
              </div>
            )}
            {showAttendees && s.attendeeNames.length > 0 && (
              <div className="text-sm text-metro-text-secondary mt-1">
                {s.attendeeNames.join(", ")}
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
              <div className="text-sm text-metro-text-secondary mt-1">
                {t("scheduleView.reason")} {s.cancelReason}
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}
