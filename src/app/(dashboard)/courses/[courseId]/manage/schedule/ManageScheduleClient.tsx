"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useT } from "@/lib/i18n/useT";
import {
  createSession,
  updateSession,
  cancelSession,
  setSessionAttendees,
  markAttendance,
} from "@/actions/schedule";
import {
  STATUS_COLORS,
  ATTENDANCE_COLORS,
  formatDateStr,
  todayStr,
} from "@/components/schedule/types";

interface Student {
  id: string;
  name: string;
  email: string;
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
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState(EMPTY_FORM);
  const [selectedStudents, setSelectedStudents] = useState<string[]>([]);
  const [allEnrolled, setAllEnrolled] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [attendeeEditId, setAttendeeEditId] = useState<string | null>(null);
  const [attendeeDraft, setAttendeeDraft] = useState<string[]>([]);

  const today = todayStr();
  const upcoming = sessions.filter((s) => s.date >= today);
  const past = sessions.filter((s) => s.date < today);

  function openCreate() {
    setEditingId(null);
    setForm(EMPTY_FORM);
    setSelectedStudents([]);
    setAllEnrolled(true);
    setError(null);
    setShowForm(true);
  }

  function openEdit(s: ManagedSession) {
    setEditingId(s.id);
    setForm({
      title: s.title,
      description: s.description ?? "",
      lessonId: s.lessonId ?? "",
      date: s.date,
      startTime: s.startTime,
      endTime: s.endTime,
      location: s.location ?? "",
      repeatWeeks: 1,
    });
    setError(null);
    setShowForm(true);
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setLoading(true);

    const fd = new FormData();
    fd.set("title", form.title);
    fd.set("description", form.description);
    fd.set("lessonId", form.lessonId);
    fd.set("date", form.date);
    fd.set("startTime", form.startTime);
    fd.set("endTime", form.endTime);
    fd.set("location", form.location);

    let result;
    if (editingId) {
      result = await updateSession(editingId, fd);
    } else {
      fd.set("courseId", courseId);
      fd.set("allEnrolled", String(allEnrolled));
      fd.set("studentIds", JSON.stringify(selectedStudents));
      fd.set("repeatWeeks", String(form.repeatWeeks));
      result = await createSession(fd);
    }
    setLoading(false);

    if (result?.error) {
      setError(
        typeof result.error === "string"
          ? result.error
          : Object.values(result.error).flat().join(", ")
      );
      return;
    }
    setShowForm(false);
    router.refresh();
  }

  async function handleCancel(sessionId: string) {
    const reason = prompt("Cancellation reason (optional):");
    if (reason === null) return;
    setLoading(true);
    await cancelSession(sessionId, reason || undefined);
    setLoading(false);
    router.refresh();
  }

  async function handleAttendance(
    sessionId: string,
    studentId: string,
    attendance: string
  ) {
    const fd = new FormData();
    fd.set("sessionId", sessionId);
    fd.set("studentId", studentId);
    fd.set("attendance", attendance);
    await markAttendance(fd);
    router.refresh();
  }

  function openAttendeeEdit(s: ManagedSession) {
    setAttendeeEditId(s.id);
    setAttendeeDraft(s.attendees.map((a) => a.studentId));
  }

  async function saveAttendees(sessionId: string) {
    setLoading(true);
    const result = await setSessionAttendees(sessionId, attendeeDraft);
    setLoading(false);
    if (result?.error) {
      alert(
        typeof result.error === "string" ? result.error : "Failed to update"
      );
      return;
    }
    setAttendeeEditId(null);
    router.refresh();
  }

  function toggleDraftStudent(id: string) {
    setAttendeeDraft((prev) =>
      prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]
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
        <form
          onSubmit={handleSubmit}
          className="metro-card space-y-4"
        >
          <h2 className="metro-section-title">
            {editingId ? t("schedule.editSession") : t("schedule.newSessionTitle")}
          </h2>

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
                  onChange={(e) =>
                    setForm({ ...form, endTime: e.target.value })
                  }
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

            {!editingId && (
              <>
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
                    {[2, 3, 4, 6, 8, 10, 12].map((n) => (
                      <option key={n} value={n}>
                        {t("schedule.weeks").replace("{n}", String(n))}
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
                    {t("schedule.allEnrolled").replace("{n}", String(students.length))}
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
                          {s.name}{" "}
                          <span className="text-metro-text-secondary">({s.email})</span>
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
              </>
            )}
          </div>

          <div className="flex gap-2">
            <button
              type="submit"
              disabled={loading}
              className="bg-metro-blue text-white px-4 py-2 text-sm font-medium hover:bg-metro-blue-hover disabled:opacity-50"
            >
              {editingId ? t("schedule.saveChanges") : t("schedule.createSession")}
            </button>
            <button
              type="button"
              onClick={() => setShowForm(false)}
              className="border border-metro-border px-4 py-2 text-sm text-metro-text-secondary hover:bg-metro-blue-light"
            >
              {t("schedule.cancel")}
            </button>
          </div>
        </form>
      )}

      <SessionSection
        title={t("schedule.past")}
        sessions={past}
        past
        loading={loading}
        students={students}
        attendeeEditId={attendeeEditId}
        attendeeDraft={attendeeDraft}
        onEdit={openEdit}
        onCancel={handleCancel}
        onAttendance={handleAttendance}
        onOpenAttendees={openAttendeeEdit}
        onToggleDraft={toggleDraftStudent}
        onSaveAttendees={saveAttendees}
        onCloseAttendees={() => setAttendeeEditId(null)}
        t={t}
      />
      <SessionSection
        title={t("schedule.past")}
        sessions={past}
        past
        loading={loading}
        students={students}
        attendeeEditId={attendeeEditId}
        attendeeDraft={attendeeDraft}
        onEdit={openEdit}
        onCancel={handleCancel}
        onAttendance={handleAttendance}
        onOpenAttendees={openAttendeeEdit}
        onToggleDraft={toggleDraftStudent}
        onSaveAttendees={saveAttendees}
        onCloseAttendees={() => setAttendeeEditId(null)}
        t={t}
      />
      <SessionSection
        title={t("schedule.upcoming")}
        sessions={upcoming}
        past={false}
        loading={loading}
        students={students}
        attendeeEditId={attendeeEditId}
        attendeeDraft={attendeeDraft}
        onEdit={openEdit}
        onCancel={handleCancel}
        onAttendance={handleAttendance}
        onOpenAttendees={openAttendeeEdit}
        onToggleDraft={toggleDraftStudent}
        onSaveAttendees={saveAttendees}
        onCloseAttendees={() => setAttendeeEditId(null)}
        t={t}
      />
    </div>
  );
}

function SessionSection({
  title,
  sessions,
  past,
  loading,
  students,
  attendeeEditId,
  attendeeDraft,
  onEdit,
  onCancel,
  onAttendance,
  onOpenAttendees,
  onToggleDraft,
  onSaveAttendees,
  onCloseAttendees,
  t,
}: {
  title: string;
  sessions: ManagedSession[];
  past: boolean;
  loading: boolean;
  students: Student[];
  attendeeEditId: string | null;
  attendeeDraft: string[];
  onEdit: (s: ManagedSession) => void;
  onCancel: (id: string) => void;
  onAttendance: (sessionId: string, studentId: string, status: string) => void;
  onOpenAttendees: (s: ManagedSession) => void;
  onToggleDraft: (id: string) => void;
  onSaveAttendees: (sessionId: string) => void;
  onCloseAttendees: () => void;
  t: (p: string) => string;
}) {
  if (sessions.length === 0) {
    return (
      <section>
        <h2 className="metro-section-title mb-3">{title.toLowerCase()}</h2>
        <p className="text-sm text-metro-text-secondary">
          {t("schedule.noSections").replace("{section}", title.toLowerCase())}
        </p>
      </section>
    );
  }

  return (
    <section>
      <h2 className="metro-section-title mb-3">{title.toLowerCase()}</h2>
      <div className="space-y-3">
        {sessions.map((s) => (
          <div key={s.id} className="metro-card">
            <div className="flex items-start justify-between gap-3 flex-wrap">
              <div>
                <div className="flex items-center gap-2 flex-wrap">
                  <span className="font-semibold text-metro-text">{s.title}</span>
                  <span
                    className={`metro-badge ${STATUS_COLORS[s.status] || ""}`}
                  >
                    {s.status}
                  </span>
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
                {s.status === "CANCELLED" && s.cancelReason && (
                  <div className="text-sm text-metro-text-secondary mt-0.5">
                    Reason: {s.cancelReason}
                  </div>
                )}
              </div>

              {s.status !== "CANCELLED" && (
                <div className="flex gap-3 text-sm font-medium">
                  {!past && (
                    <>
                      <button
                        onClick={() => onEdit(s)}
                        className="text-metro-blue hover:text-metro-blue-hover"
                      >
                        {t("schedule.edit")}
                      </button>
                      <button
                        onClick={() => onOpenAttendees(s)}
                        className="text-metro-text-secondary hover:text-metro-text"
                      >
                        {t("schedule.studentsLbl")}
                      </button>
                    </>
                  )}
                  <button
                    onClick={() => onCancel(s.id)}
                    disabled={loading}
                    className="text-metro-error hover:underline disabled:opacity-50"
                  >
                    {t("schedule.cancelBtn")}
                  </button>
                </div>
              )}
            </div>

            {/* Attendee editor */}
            {attendeeEditId === s.id ? (
              <div className="mt-3 border-t border-metro-border pt-3">
                <p className="text-sm font-medium text-metro-text mb-2">
                  {t("schedule.assignedStudents")}
                </p>
                <div className="grid gap-1 sm:grid-cols-2">
                  {students.map((st) => (
                    <label
                      key={st.id}
                      className="flex items-center gap-2 text-sm py-0.5"
                    >
                      <input
                        type="checkbox"
                        checked={attendeeDraft.includes(st.id)}
                        onChange={() => onToggleDraft(st.id)}
                      />
                      {st.name}
                    </label>
                  ))}
                </div>
                <div className="flex gap-2 mt-2">
                  <button
                    onClick={() => onSaveAttendees(s.id)}
                    disabled={loading}
                    className="bg-metro-blue text-white px-3 py-1.5 text-sm hover:bg-metro-blue-hover disabled:opacity-50"
                  >
                    {t("schedule.save")}
                  </button>
                  <button
                    onClick={onCloseAttendees}
                    className="border border-metro-border px-3 py-1.5 text-sm text-metro-text-secondary"
                  >
                    {t("schedule.close")}
                  </button>
                </div>
              </div>
            ) : (
              s.attendees.length > 0 && (
                <div className="mt-3 border-t border-metro-border pt-3 space-y-1">
                  {s.attendees.map((a) => (
                    <div
                      key={a.studentId}
                      className="flex items-center justify-between text-sm"
                    >
                      <span className="text-metro-text">
                        {a.name}
                        {a.attendance && (
                          <span
                            className={`ml-2 ${ATTENDANCE_COLORS[a.attendance] || ""}`}
                          >
                            {a.attendance.charAt(0) +
                              a.attendance.slice(1).toLowerCase()}
                          </span>
                        )}
                        {a.notes && (
                          <span className="ml-2 text-metro-text-secondary">({a.notes})</span>
                        )}
                      </span>
                      {s.status !== "CANCELLED" &&
                        s.date <= todayStr() && (
                          <span className="flex gap-1">
                            {["PRESENT", "LATE", "ABSENT"].map((st) => (
                              <button
                                key={st}
                                onClick={() =>
                                  onAttendance(s.id, a.studentId, st)
                                }
                                className={`text-xs px-2 py-0.5 border ${
                                  a.attendance === st
                                    ? "bg-metro-chrome-dark text-white border-metro-chrome-dark"
                                    : "border-metro-border text-metro-text-secondary hover:bg-metro-blue-light"
                                }`}
                              >
                                {st.charAt(0) + st.slice(1).toLowerCase()}
                              </button>
                            ))}
                          </span>
                        )}
                    </div>
                  ))}
                </div>
              )
            )}
          </div>
        ))}
      </div>
    </section>
  );
}
