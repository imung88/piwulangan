"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { useT, format } from "@/lib/i18n/useT";
import { useToast } from "@/components/ui/Toast";
import {
  updateSession,
  cancelSession,
  setSessionAttendees,
  markAttendance,
  markAllPresent,
} from "@/actions/schedule";
import {
  STATUS_COLORS,
  ATTENDANCE_COLORS,
  statusLabel,
  attendanceLabel,
  formatDateStr,
  todayStr,
} from "@/components/schedule/types";

interface Attendee {
  studentId: string;
  name: string;
  email: string | null;
  attendance: string | null;
  notes: string | null;
}

interface Student {
  id: string;
  name: string;
  email: string | null;
}

interface LessonOption {
  id: string;
  title: string;
}

interface SessionData {
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
  instructorName: string;
  attendees: Attendee[];
}

interface Props {
  courseId: string;
  session: SessionData;
  canManage: boolean;
  students: Student[];
  lessons: LessonOption[];
  viewerStudentIds: string[];
}

const ATT_ACTIVE: Record<string, string> = {
  PRESENT: "bg-metro-green text-white border-metro-green",
  LATE: "bg-metro-orange text-white border-metro-orange",
  ABSENT: "bg-metro-error text-white border-metro-error",
};

const ATT_STATUSES = ["PRESENT", "LATE", "ABSENT"] as const;

export default function SessionDetailClient({
  courseId,
  session,
  canManage,
  students,
  lessons,
  viewerStudentIds,
}: Props) {
  const t = useT();
  const router = useRouter();
  const toast = useToast();
  const today = todayStr();

  const isCancelled = session.status === "CANCELLED";
  const isPast = session.date < today;
  const canEditDetails = canManage && !isCancelled && session.date >= today;
  const canMarkAttendance = canManage && !isCancelled && session.date <= today;

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [savingKey, setSavingKey] = useState<string | null>(null);
  const [notesDraft, setNotesDraft] = useState<Record<string, string>>({});
  const [att, setAtt] = useState<Record<string, string | null>>(() =>
    Object.fromEntries(session.attendees.map((a) => [a.studentId, a.attendance]))
  );
  const [openNotes, setOpenNotes] = useState<Record<string, boolean>>({});
  const [savedTick, setSavedTick] = useState<string | null>(null);

  // router.refresh() re-renders with fresh props but keeps this component
  // mounted, so the optimistic map must be re-synced when the server data changes.
  useEffect(() => {
    setAtt(
      Object.fromEntries(session.attendees.map((a) => [a.studentId, a.attendance]))
    );
  }, [session.attendees]);

  // Edit-details form
  const [editing, setEditing] = useState(false);
  const [form, setForm] = useState({
    title: session.title,
    description: session.description ?? "",
    lessonId: session.lessonId ?? "",
    date: session.date,
    startTime: session.startTime,
    endTime: session.endTime,
    location: session.location ?? "",
  });

  // Roster editor
  const [editingRoster, setEditingRoster] = useState(false);
  const [rosterDraft, setRosterDraft] = useState<string[]>(
    session.attendees.map((a) => a.studentId)
  );
  const [rosterError, setRosterError] = useState<string | null>(null);

  // Cancel form
  const [canceling, setCanceling] = useState(false);
  const [cancelReason, setCancelReason] = useState("");

  async function handleSaveDetails(e: React.FormEvent) {
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
    fd.set("date", form.date);
    fd.set("startTime", form.startTime);
    fd.set("endTime", form.endTime);
    fd.set("location", form.location);
    const result = await updateSession(session.id, fd);
    setLoading(false);
    if (result?.error) {
      setError(
        typeof result.error === "string"
          ? result.error
          : Object.values(result.error).flat().join(", ")
      );
      return;
    }
    setEditing(false);
    router.refresh();
  }

  async function handleCancel() {
    setLoading(true);
    await cancelSession(session.id, cancelReason || undefined);
    setLoading(false);
    setCanceling(false);
    setCancelReason("");
    router.refresh();
  }

  async function handleSaveRoster() {
    setRosterError(null);
    setLoading(true);
    const result = await setSessionAttendees(session.id, rosterDraft);
    setLoading(false);
    if (result?.error) {
      setRosterError(
        typeof result.error === "string"
          ? result.error
          : t("schedule.attendeeSaveFailed")
      );
      return;
    }
    setEditingRoster(false);
    router.refresh();
  }

  function toggleRoster(id: string) {
    setRosterDraft((prev) =>
      prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]
    );
  }

  async function submitAttendance(
    studentId: string,
    attendance: string,
    notes: string
  ) {
    const prev = att[studentId] ?? null;
    setAtt((m) => ({ ...m, [studentId]: attendance === "NONE" ? null : attendance }));
    setSavingKey(studentId);
    const fd = new FormData();
    fd.set("sessionId", session.id);
    fd.set("studentId", studentId);
    fd.set("attendance", attendance);
    fd.set("notes", notes ?? "");
    try {
      await markAttendance(fd);
      setSavedTick(studentId);
      setTimeout(() => setSavedTick((k) => (k === studentId ? null : k)), 2000);
      router.refresh();
    } catch {
      setAtt((m) => ({ ...m, [studentId]: prev }));
      toast.error(t("sessionDetail.attendanceFailed"));
    } finally {
      setSavingKey(null);
    }
  }

  async function handleMarkAllPresent() {
    const prev = att;
    setAtt(Object.fromEntries(session.attendees.map((a) => [a.studentId, "PRESENT"])));
    setSavingKey("*");
    try {
      await markAllPresent(session.id);
      router.refresh();
    } catch {
      setAtt(prev);
      toast.error(t("sessionDetail.attendanceFailed"));
    } finally {
      setSavingKey(null);
    }
  }

  const counts = { PRESENT: 0, LATE: 0, ABSENT: 0, NONE: 0 };
  for (const a of session.attendees) {
    counts[(att[a.studentId] ?? "NONE") as keyof typeof counts]++;
  }
  const summary = format(t("schedule.attendanceSummary"), {
    present: counts.PRESENT,
    late: counts.LATE,
    absent: counts.ABSENT,
    unmarked: counts.NONE,
  });

  const viewerAttendees = session.attendees.filter((a) =>
    viewerStudentIds.includes(a.studentId)
  );

  return (
    <div className="space-y-6">
      {/* Header card */}
      <div className="metro-card">
        <div className="flex items-start justify-between gap-3 flex-wrap">
          <div>
            <div className="flex items-center gap-2 flex-wrap">
              <span className="text-lg font-semibold text-metro-text">
                {session.title}
              </span>
              <span className={`metro-badge ${STATUS_COLORS[session.status] || ""}`}>
                {statusLabel(session.status, t)}
              </span>
            </div>
            <div className="text-sm text-metro-text-secondary mt-1">
              {formatDateStr(session.date)} · {session.startTime}–{session.endTime}
              {session.location && <> · {session.location}</>}
            </div>
            <div className="text-sm text-metro-text-secondary mt-0.5">
              {session.instructorName}
            </div>
            {session.lessonTitle && (
              <div className="text-sm text-metro-blue mt-0.5">
                📖{" "}
                {session.lessonId ? (
                  <Link
                    href={`/courses/${courseId}/lessons/${session.lessonId}`}
                    className="hover:underline"
                  >
                    {session.lessonTitle}
                  </Link>
                ) : (
                  session.lessonTitle
                )}
              </div>
            )}
            {session.description && (
              <p className="text-sm text-metro-text mt-2 whitespace-pre-wrap">
                {session.description}
              </p>
            )}
            {isCancelled && session.cancelReason && (
              <div className="text-sm text-metro-text-secondary mt-2">
                {t("schedule.reasonLabel")} {session.cancelReason}
              </div>
            )}
          </div>

          {canManage && !isCancelled && (
            <div className="flex gap-3 text-sm font-medium">
              {canEditDetails && !editing && (
                <button
                  onClick={() => setEditing(true)}
                  className="text-metro-blue hover:text-metro-blue-hover"
                >
                  {t("sessionDetail.editDetails")}
                </button>
              )}
              <button
                onClick={() => {
                  setCanceling(true);
                  setCancelReason("");
                }}
                disabled={loading}
                className="text-metro-error hover:underline disabled:opacity-50"
              >
                {t("schedule.cancelBtn")}
              </button>
            </div>
          )}
        </div>

        {/* Inline cancel form */}
        {canceling && (
          <div className="mt-3 border-t border-metro-border pt-3">
            <label className="block text-sm font-medium text-metro-text mb-1">
              {t("schedule.cancellationReason")}
            </label>
            <input
              type="text"
              value={cancelReason}
              maxLength={200}
              onChange={(e) => setCancelReason(e.target.value)}
              className="metro-input w-full px-3 py-2 text-sm mb-2"
            />
            <div className="flex gap-2">
              <button
                onClick={handleCancel}
                disabled={loading}
                className="bg-metro-error text-white px-3 py-1.5 text-sm hover:opacity-90 disabled:opacity-50"
              >
                {t("schedule.confirmCancel")}
              </button>
              <button
                onClick={() => setCanceling(false)}
                className="border border-metro-border px-3 py-1.5 text-sm text-metro-text-secondary"
              >
                {t("schedule.keepSession")}
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Edit details form (managers, future/today) */}
      {canEditDetails && editing && (
        <form onSubmit={handleSaveDetails} className="metro-card space-y-4">
          <h2 className="metro-section-title">{t("sessionDetail.editDetails")}</h2>
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
          </div>
          <div className="flex gap-2">
            <button
              type="submit"
              disabled={loading}
              className="bg-metro-blue text-white px-4 py-2 text-sm font-medium hover:bg-metro-blue-hover disabled:opacity-50"
            >
              {t("schedule.saveChanges")}
            </button>
            <button
              type="button"
              onClick={() => setEditing(false)}
              className="border border-metro-border px-4 py-2 text-sm text-metro-text-secondary hover:bg-metro-blue-light"
            >
              {t("schedule.cancel")}
            </button>
          </div>
        </form>
      )}

      {/* Attendance (managers). Editable today+past; read-only lock note otherwise. */}
      {canManage && !isCancelled && (
        <section className="metro-card">
          <div className="flex items-center justify-between gap-2 mb-2 flex-wrap">
            <h2 className="metro-section-title">{t("schedule.attendance")}</h2>
            <div className="flex items-center gap-3">
              {session.date >= today && !isPast && (
                <button
                  onClick={() => {
                    setEditingRoster((v) => !v);
                    setRosterDraft(session.attendees.map((a) => a.studentId));
                    setRosterError(null);
                  }}
                  className="text-sm text-metro-text-secondary hover:text-metro-text font-medium"
                >
                  {t("sessionDetail.roster")}
                </button>
              )}
              {canMarkAttendance && session.attendees.length > 0 && (
                <button
                  onClick={handleMarkAllPresent}
                  disabled={savingKey === "*"}
                  className="min-h-[44px] px-3 text-sm font-semibold border-2 border-metro-green text-metro-green hover:bg-metro-green-light disabled:opacity-50"
                >
                  {t("schedule.markAllPresent")}
                </button>
              )}
            </div>
          </div>

          {session.attendees.length > 0 && (
            <p className="text-xs text-metro-text-secondary mb-3">{summary}</p>
          )}

          {!canMarkAttendance && !isPast && (
            <p className="text-sm text-metro-text-secondary mb-3">
              {t("sessionDetail.attendanceLocked")}
            </p>
          )}

          {/* Roster editor */}
          {editingRoster ? (
            <div className="border-t border-metro-border pt-3">
              <p className="text-sm font-medium text-metro-text mb-2">
                {t("schedule.assignedStudents")}
              </p>
              {rosterError && (
                <div className="bg-metro-error px-3 py-2 text-sm text-white mb-2">
                  {rosterError}
                </div>
              )}
              <div className="grid gap-1 sm:grid-cols-2">
                {students.map((st) => (
                  <label
                    key={st.id}
                    className="flex items-center gap-2 text-sm py-0.5"
                  >
                    <input
                      type="checkbox"
                      checked={rosterDraft.includes(st.id)}
                      onChange={() => toggleRoster(st.id)}
                    />
                    {st.name}
                  </label>
                ))}
                {students.length === 0 && (
                  <p className="text-sm text-metro-text-secondary">
                    {t("schedule.noEnrolledStudents")}
                  </p>
                )}
              </div>
              <div className="flex gap-2 mt-2">
                <button
                  onClick={handleSaveRoster}
                  disabled={loading}
                  className="bg-metro-blue text-white px-3 py-1.5 text-sm hover:bg-metro-blue-hover disabled:opacity-50"
                >
                  {t("schedule.save")}
                </button>
                <button
                  onClick={() => setEditingRoster(false)}
                  className="border border-metro-border px-3 py-1.5 text-sm text-metro-text-secondary"
                >
                  {t("schedule.close")}
                </button>
              </div>
            </div>
          ) : session.attendees.length === 0 ? (
            <p className="text-sm text-metro-text-secondary">
              {t("sessionDetail.noAttendees")}
            </p>
          ) : (
            <div className="divide-y divide-metro-border">
              {session.attendees.map((a) => {
                const noteVal = notesDraft[a.studentId] ?? a.notes ?? "";
                const saving = savingKey === a.studentId || savingKey === "*";
                const current = att[a.studentId] ?? null;
                const notesVisible =
                  openNotes[a.studentId] ?? Boolean(a.notes);
                return (
                  <div key={a.studentId} className="py-3 first:pt-0 last:pb-0">
                    {canMarkAttendance ? (
                      <div className="space-y-2">
                        <div className="flex items-center justify-between gap-2">
                          <span className="text-sm font-medium text-metro-text">
                            {a.name}
                          </span>
                          <div className="flex items-center gap-2 shrink-0">
                            {savedTick === a.studentId && (
                              <span className="text-xs text-metro-green font-medium">
                                ✓ {t("common.saved")}
                              </span>
                            )}
                            <button
                              onClick={() =>
                                setOpenNotes((prev) => ({
                                  ...prev,
                                  [a.studentId]: !notesVisible,
                                }))
                              }
                              className="min-h-[44px] px-2 text-xs text-metro-text-secondary hover:text-metro-text font-medium"
                            >
                              {t("sessionDetail.noteBtn")}
                            </button>
                          </div>
                        </div>
                        <div className="grid grid-cols-3 gap-1">
                          {ATT_STATUSES.map((st) => {
                            const active = current === st;
                            return (
                              <button
                                key={st}
                                disabled={saving}
                                onClick={() =>
                                  submitAttendance(
                                    a.studentId,
                                    active ? "NONE" : st,
                                    noteVal
                                  )
                                }
                                className={`min-h-[44px] px-2 text-sm font-medium border disabled:opacity-50 ${
                                  active
                                    ? ATT_ACTIVE[st]
                                    : "border-metro-border text-metro-text-secondary hover:bg-metro-blue-light"
                                }`}
                              >
                                {attendanceLabel(st, t)}
                              </button>
                            );
                          })}
                        </div>
                        {notesVisible && (
                          <input
                            type="text"
                            value={noteVal}
                            placeholder={t("schedule.notesPlaceholder")}
                            disabled={saving}
                            onChange={(e) =>
                              setNotesDraft((prev) => ({
                                ...prev,
                                [a.studentId]: e.target.value,
                              }))
                            }
                            onBlur={() => {
                              if ((a.notes ?? "") !== noteVal) {
                                submitAttendance(
                                  a.studentId,
                                  current ?? "NONE",
                                  noteVal
                                );
                              }
                            }}
                            className="metro-input w-full px-3 py-2 text-sm"
                          />
                        )}
                      </div>
                    ) : (
                      <div className="flex flex-wrap items-center justify-between gap-2 text-sm">
                        <span className="text-metro-text">{a.name}</span>
                        <span className="text-metro-text-secondary">
                          {current ? (
                            <span className={ATTENDANCE_COLORS[current] || ""}>
                              {attendanceLabel(current, t)}
                            </span>
                          ) : (
                            attendanceLabel(null, t)
                          )}
                          {a.notes && <> · {a.notes}</>}
                        </span>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </section>
      )}

      {/* Read-only view for students / guardians */}
      {!canManage && (
        <section className="metro-card">
          <h2 className="metro-section-title mb-3">
            {t("sessionDetail.yourAttendance")}
          </h2>
          {viewerAttendees.length === 0 ? (
            <p className="text-sm text-metro-text-secondary">
              {t("sessionDetail.notRecorded")}
            </p>
          ) : (
            <div className="space-y-2">
              {viewerAttendees.map((a) => (
                <div
                  key={a.studentId}
                  className="flex items-center justify-between gap-2 text-sm"
                >
                  <span className="text-metro-text">{a.name}</span>
                  <span className="text-metro-text-secondary">
                    {a.attendance ? (
                      <span className={ATTENDANCE_COLORS[a.attendance] || ""}>
                        {attendanceLabel(a.attendance, t)}
                      </span>
                    ) : (
                      t("sessionDetail.notRecorded")
                    )}
                    {a.notes && <> · {a.notes}</>}
                  </span>
                </div>
              ))}
            </div>
          )}
        </section>
      )}
    </div>
  );
}
