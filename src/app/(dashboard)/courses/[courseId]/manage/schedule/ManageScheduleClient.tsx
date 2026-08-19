"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { useT, format } from "@/lib/i18n/useT";
import { createSessionSeries, cancelSessionSeries } from "@/actions/sessionSeries";
import {
  STATUS_COLORS,
  statusLabel,
  formatDateStr,
  todayStr,
} from "@/components/schedule/types";
import ConfirmDialog from "@/components/ui/ConfirmDialog";

interface Student {
  id: string;
  name: string;
  email: string | null;
}

interface LessonOption {
  id: string;
  title: string;
}

interface ManagedSession {
  id: string;
  title: string;
  description: string | null;
  date: string;
  startTime: string;
  endTime: string;
  location: string | null;
  status: string;
  cancelReason: string | null;
  lessonId: string | null;
  lessonTitle: string | null;
  seriesId: string | null;
  seriesWeek: number | null;
  attendees: {
    studentId: string;
    name: string;
    attendance: string | null;
    notes: string | null;
  }[];
}

interface Props {
  courseId: string;
  students: Student[];
  lessons: LessonOption[];
  sessions: ManagedSession[];
}

const EMPTY_FORM = {
  title: "",
  description: "",
  lessonId: "",
  date: "",
  startTime: "09:00",
  endTime: "10:00",
  location: "",
  repeatWeeks: 1,
};

export default function ManageScheduleClient({
  courseId,
  students,
  lessons,
  sessions,
}: Props) {
  const t = useT();
  const router = useRouter();
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState(EMPTY_FORM);
  const [selectedStudents, setSelectedStudents] = useState<string[]>([]);
  const [allEnrolled, setAllEnrolled] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  // Series management state
  const [showCancelSeriesConfirm, setShowCancelSeriesConfirm] = useState(false);
  const [selectedSeriesId, setSelectedSeriesId] = useState<string | null>(null);

  const today = todayStr();
  const upcoming = sessions.filter((s) => s.date >= today);
  const past = sessions.filter((s) => s.date < today);

  // Group sessions by series for visualization
  const seriesMap = new Map<string, ManagedSession[]>();
  for (const session of sessions) {
    if (session.seriesId) {
      const seriesSessions = seriesMap.get(session.seriesId) || [];
      seriesSessions.push(session);
      seriesMap.set(session.seriesId, seriesSessions);
    }
  }

  function openCreate() {
    setForm(EMPTY_FORM);
    setSelectedStudents([]);
    setAllEnrolled(true);
    setError(null);
    setShowForm(true);
  }

  function closeForm() {
    setShowForm(false);
    setForm(EMPTY_FORM);
    setError(null);
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);

    if (form.endTime <= form.startTime) {
      setError(t("schedule.endBeforeStart"));
      return;
    }

    setLoading(true);
    const fd = new FormData();
    fd.set("title", form.title);
    fd.set("description", form.description);
    fd.set("lessonId", form.lessonId);
    fd.set("startDate", form.date);
    fd.set("startTime", form.startTime);
    fd.set("endTime", form.endTime);
    fd.set("location", form.location);
    fd.set("courseId", courseId);
    fd.set("allEnrolled", String(allEnrolled));
    fd.set("studentIds", JSON.stringify(selectedStudents));
    fd.set("repeatWeeks", String(form.repeatWeeks));
    
    const result = await createSessionSeries(fd);
    setLoading(false);

    if (!result.success) {
      setError(result.error);
      return;
    }
    closeForm();
    router.refresh();
  }

  async function handleCancelSeries() {
    if (!selectedSeriesId) return;
    
    setLoading(true);
    const result = await cancelSessionSeries(selectedSeriesId);
    setLoading(false);
    setShowCancelSeriesConfirm(false);
    setSelectedSeriesId(null);

    if (!result.success) {
      setError(result.error);
      return;
    }
    router.refresh();
  }

  function renderRow(s: ManagedSession) {
    const counts = { PRESENT: 0, LATE: 0, ABSENT: 0, NONE: 0 };
    for (const a of s.attendees) {
      counts[(a.attendance ?? "NONE") as keyof typeof counts]++;
    }
    const summary = format(t("schedule.attendanceSummary"), {
      present: counts.PRESENT,
      late: counts.LATE,
      absent: counts.ABSENT,
      unmarked: counts.NONE,
    });

    // Check if this session is part of a series
    const isSeriesSession = s.seriesId !== null;
    const seriesInfo = isSeriesSession 
      ? format(t("schedule.seriesWeek"), { 
          week: s.seriesWeek || 0, 
          total: seriesMap.get(s.seriesId!)?.length || 0 
        })
      : null;

    return (
      <Link
        key={s.id}
        href={`/courses/${courseId}/schedule/${s.id}`}
        className="metro-card block hover:bg-metro-blue-light transition-colors"
      >
        <div className="flex items-start justify-between gap-3 flex-wrap">
          <div>
            <div className="flex items-center gap-2 flex-wrap">
              <span className="font-semibold text-metro-text">{s.title}</span>
              <span className={`metro-badge ${STATUS_COLORS[s.status] || ""}`}>
                {statusLabel(s.status, t)}
              </span>
              {isSeriesSession && (
                <span className="metro-badge bg-metro-blue-light text-metro-blue">
                  📅 {t("schedule.series")} · {seriesInfo}
                </span>
              )}
            </div>
            <div className="text-sm text-metro-text-secondary mt-1">
              {formatDateStr(s.date)} · {s.startTime}–{s.endTime}
              {s.location && <> · {s.location}</>}
            </div>
            {s.lessonTitle && (
              <div className="text-sm text-metro-blue mt-0.5">
                📖 {s.lessonTitle}
              </div>
            )}
            {s.attendees.length > 0 && (
              <div className="text-xs text-metro-text-secondary mt-1">
                {summary}
              </div>
            )}
          </div>
          <span className="text-sm text-metro-blue font-medium">
            {t("schedule.viewDetails")}
          </span>
        </div>
      </Link>
    );
  }

  function renderSection(title: string, list: ManagedSession[]) {
    return (
      <section>
        <h2 className="metro-section-title mb-3">{title}</h2>
        {list.length === 0 ? (
          <p className="text-sm text-metro-text-secondary">
            {format(t("schedule.noSections"), { section: title })}
          </p>
        ) : (
          <div className="space-y-3">{list.map((s) => renderRow(s))}</div>
        )}
      </section>
    );
  }

  return (
    <div className="space-y-6">
      {!showForm && (
        <button
          onClick={openCreate}
          className="bg-metro-blue text-white px-4 py-2 text-sm font-medium hover:bg-metro-blue-hover"
        >
          {t("schedule.newSession")}
        </button>
      )}

      {showForm && (
        <form onSubmit={handleSubmit} className="metro-card space-y-4">
          <h2 className="metro-section-title">{t("schedule.newSessionTitle")}</h2>

          {error && (
            <div className="bg-metro-error px-3 py-2 text-sm text-white">
              {error}
            </div>
          )}

          <div className="grid gap-4 sm:grid-cols-2">
            <div className="sm:col-span-2">
              <label className="block text-sm font-medium text-metro-text mb-1">
                {t("schedule.topic")}
              </label>
              <input
                type="text"
                required
                value={form.title}
                onChange={(e) => setForm({ ...form, title: e.target.value })}
                placeholder={t("schedule.topicPlaceholder")}
                className="metro-input w-full px-3 py-2 text-sm"
              />
            </div>

            <div className="sm:col-span-2">
              <label className="block text-sm font-medium text-metro-text mb-1">
                {t("schedule.description")}
              </label>
              <textarea
                value={form.description}
                onChange={(e) =>
                  setForm({ ...form, description: e.target.value })
                }
                rows={2}
                className="metro-input w-full px-3 py-2 text-sm"
              />
            </div>

            <div className="sm:col-span-2">
              <label className="block text-sm font-medium text-metro-text mb-1">
                {t("schedule.linkedLesson")}
              </label>
              <select
                value={form.lessonId}
                onChange={(e) => setForm({ ...form, lessonId: e.target.value })}
                className="metro-input w-full px-3 py-2 text-sm"
              >
                <option value="">{t("schedule.none")}</option>
                {lessons.map((l) => (
                  <option key={l.id} value={l.id}>
                    {l.title}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-metro-text mb-1">
                {t("schedule.date")}
              </label>
              <input
                type="date"
                required
                min={today}
                value={form.date}
                onChange={(e) => setForm({ ...form, date: e.target.value })}
                className="metro-input w-full px-3 py-2 text-sm"
              />
            </div>

            <div className="flex gap-2">
              <div className="flex-1">
                <label className="block text-sm font-medium text-metro-text mb-1">
                  {t("schedule.start")}
                </label>
                <input
                  type="time"
                  required
                  value={form.startTime}
                  onChange={(e) =>
                    setForm({ ...form, startTime: e.target.value })
                  }
                  className="metro-input w-full px-3 py-2 text-sm"
                />
              </div>
              <div className="flex-1">
                <label className="block text-sm font-medium text-metro-text mb-1">
                  {t("schedule.end")}
                </label>
                <input
                  type="time"
                  required
                  value={form.endTime}
                  onChange={(e) => setForm({ ...form, endTime: e.target.value })}
                  className="metro-input w-full px-3 py-2 text-sm"
                />
              </div>
            </div>

            <div className="sm:col-span-2">
              <label className="block text-sm font-medium text-metro-text mb-1">
                {t("schedule.location")}
              </label>
              <input
                type="text"
                value={form.location}
                onChange={(e) => setForm({ ...form, location: e.target.value })}
                placeholder={t("schedule.locationPlaceholder")}
                className="metro-input w-full px-3 py-2 text-sm"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-metro-text mb-1">
                {t("schedule.repeatWeekly")}
              </label>
              <select
                value={form.repeatWeeks}
                onChange={(e) =>
                  setForm({ ...form, repeatWeeks: Number(e.target.value) })
                }
                className="metro-input w-full px-3 py-2 text-sm"
              >
                <option value={1}>{t("schedule.noRepeat")}</option>
                {[2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12].map((n) => (
                  <option key={n} value={n}>
                    {format(t("schedule.weeks"), { n })}
                  </option>
                ))}
              </select>
            </div>

            <div className="sm:col-span-2">
              <label className="block text-sm font-medium text-metro-text mb-2">
                {t("schedule.students")}
              </label>
              <label className="flex items-center gap-2 text-sm mb-2">
                <input
                  type="checkbox"
                  checked={allEnrolled}
                  onChange={(e) => setAllEnrolled(e.target.checked)}
                />
                {format(t("schedule.allEnrolled"), { n: students.length })}
              </label>
              {!allEnrolled && (
                <div className="grid gap-1 sm:grid-cols-2 max-h-48 overflow-y-auto border border-metro-border p-2">
                  {students.map((s) => (
                    <label
                      key={s.id}
                      className="flex items-center gap-2 text-sm py-1"
                    >
                      <input
                        type="checkbox"
                        checked={selectedStudents.includes(s.id)}
                        onChange={(e) =>
                          setSelectedStudents((prev) =>
                            e.target.checked
                              ? [...prev, s.id]
                              : prev.filter((id) => id !== s.id)
                          )
                        }
                      />
                      {s.name}
                      {s.email && (
                        <span className="text-metro-text-secondary">
                          ({s.email})
                        </span>
                      )}
                    </label>
                  ))}
                  {students.length === 0 && (
                    <p className="text-sm text-metro-text-secondary">
                      {t("schedule.noEnrolledStudents")}
                    </p>
                  )}
                </div>
              )}
            </div>
          </div>

          <div className="flex gap-2">
            <button
              type="submit"
              disabled={loading}
              className="bg-metro-blue text-white px-4 py-2 text-sm font-medium hover:bg-metro-blue-hover disabled:opacity-50"
            >
              {t("schedule.createSession")}
            </button>
            <button
              type="button"
              onClick={closeForm}
              className="border border-metro-border px-4 py-2 text-sm text-metro-text-secondary hover:bg-metro-blue-light"
            >
              {t("schedule.cancel")}
            </button>
          </div>
        </form>
      )}

      {renderSection(t("schedule.upcoming"), upcoming)}
      {renderSection(t("schedule.past"), past)}

      {/* Cancel Series Confirmation Dialog */}
      <ConfirmDialog
        open={showCancelSeriesConfirm}
        title={t("schedule.cancelSeriesConfirm")}
        message={t("schedule.cancelSeriesWarn")}
        confirmLabel={t("schedule.cancelSeries")}
        cancelLabel={t("common.cancel")}
        onConfirm={handleCancelSeries}
        onCancel={() => {
          setShowCancelSeriesConfirm(false);
          setSelectedSeriesId(null);
        }}
      />
    </div>
  );
}
