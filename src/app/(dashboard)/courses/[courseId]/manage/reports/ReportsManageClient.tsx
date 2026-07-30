"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { useT, format } from "@/lib/i18n/useT";
import { useToast } from "@/components/ui/Toast";
import ConfirmDialog from "@/components/ui/ConfirmDialog";
import { createReport, updateReport, deleteReport } from "@/actions/reports";

type Student = { id: string; name: string };
type ModuleOption = { id: string; title: string; lessons: { id: string; title: string }[] };
type Report = {
  id: string;
  studentId: string;
  studentName: string;
  authorName: string;
  moduleTitle: string | null;
  lessonTitle: string | null;
  body: string;
  createdAt: string;
};

export default function ReportsManageClient({
  courseId,
  initialStudentId,
  students,
  modules,
  reports,
}: {
  courseId: string;
  initialStudentId: string;
  students: Student[];
  modules: ModuleOption[];
  reports: Report[];
}) {
  const t = useT();
  const toast = useToast();
  const router = useRouter();
  const [pending, startTransition] = useTransition();

  const [studentId, setStudentId] = useState(initialStudentId);
  const [moduleId, setModuleId] = useState("");
  const [lessonId, setLessonId] = useState("");
  const [body, setBody] = useState("");
  const [filterStudent, setFilterStudent] = useState(initialStudentId);

  const [editingId, setEditingId] = useState<string | null>(null);
  const [editBody, setEditBody] = useState("");
  const [deleteTarget, setDeleteTarget] = useState<Report | null>(null);

  const selectedModule = modules.find((m) => m.id === moduleId);

  function handleCreate() {
    const fd = new FormData();
    fd.set("studentId", studentId);
    fd.set("body", body);
    if (moduleId) fd.set("moduleId", moduleId);
    if (lessonId) fd.set("lessonId", lessonId);
    startTransition(async () => {
      const res = await createReport(courseId, fd);
      if (res?.error) {
        toast.error(typeof res.error === "string" ? res.error : t("reports.errorInvalid"));
        return;
      }
      toast.success(t("reports.created"));
      setBody("");
      setModuleId("");
      setLessonId("");
      router.refresh();
    });
  }

  function handleSaveEdit(reportId: string) {
    const fd = new FormData();
    fd.set("body", editBody);
    startTransition(async () => {
      const res = await updateReport(reportId, fd);
      if (res?.error) {
        toast.error(typeof res.error === "string" ? res.error : t("reports.errorInvalid"));
        return;
      }
      toast.success(t("reports.updated"));
      setEditingId(null);
      router.refresh();
    });
  }

  function handleDelete() {
    if (!deleteTarget) return;
    const id = deleteTarget.id;
    startTransition(async () => {
      const res = await deleteReport(id);
      if (res?.error) {
        toast.error(typeof res.error === "string" ? res.error : t("reports.errorInvalid"));
      } else {
        toast.success(t("reports.deleted"));
      }
      setDeleteTarget(null);
      router.refresh();
    });
  }

  const visibleReports = filterStudent
    ? reports.filter((r) => r.studentId === filterStudent)
    : reports;

  const selectClass = "metro-input w-full px-3 py-2.5 text-sm";

  return (
    <div className="mt-6 space-y-6">
      {/* Write form */}
      <div className="metro-card">
        <h2 className="metro-section-title mb-3">{t("reports.writeReport")}</h2>
        {students.length === 0 ? (
          <p className="text-sm text-metro-text-secondary">{t("reports.noStudents")}</p>
        ) : (
          <div className="space-y-3">
            <div>
              <label className="mb-1 block text-sm font-medium text-metro-text">
                {t("reports.student")}
              </label>
              <select
                value={studentId}
                onChange={(e) => setStudentId(e.target.value)}
                className={selectClass}
              >
                <option value="">{t("reports.selectStudent")}</option>
                {students.map((s) => (
                  <option key={s.id} value={s.id}>
                    {s.name}
                  </option>
                ))}
              </select>
            </div>

            <div className="grid gap-3 md:grid-cols-2">
              <div>
                <label className="mb-1 block text-sm font-medium text-metro-text">
                  {t("reports.aboutModule")}
                </label>
                <select
                  value={moduleId}
                  onChange={(e) => {
                    setModuleId(e.target.value);
                    setLessonId("");
                  }}
                  className={selectClass}
                >
                  <option value="">{t("reports.wholeCourse")}</option>
                  {modules.map((m) => (
                    <option key={m.id} value={m.id}>
                      {m.title}
                    </option>
                  ))}
                </select>
              </div>
              {selectedModule && selectedModule.lessons.length > 0 && (
                <div>
                  <label className="mb-1 block text-sm font-medium text-metro-text">
                    {t("reports.aboutLesson")}
                  </label>
                  <select
                    value={lessonId}
                    onChange={(e) => setLessonId(e.target.value)}
                    className={selectClass}
                  >
                    <option value="">{t("reports.wholeModule")}</option>
                    {selectedModule.lessons.map((l) => (
                      <option key={l.id} value={l.id}>
                        {l.title}
                      </option>
                    ))}
                  </select>
                </div>
              )}
            </div>

            <div>
              <label className="mb-1 block text-sm font-medium text-metro-text">
                {t("reports.reportText")}
              </label>
              <textarea
                value={body}
                onChange={(e) => setBody(e.target.value)}
                rows={4}
                placeholder={t("reports.placeholder")}
                className="metro-input w-full px-3 py-2.5 text-sm"
              />
            </div>

            <button
              onClick={handleCreate}
              disabled={pending || !studentId || !body.trim()}
              className="min-h-[44px] w-full bg-metro-blue px-4 py-2.5 text-sm font-medium text-white hover:bg-metro-blue-hover disabled:opacity-50 sm:w-auto"
            >
              {pending ? t("reports.saving") : t("reports.submit")}
            </button>
          </div>
        )}
      </div>

      {/* Report list */}
      <div>
        <div className="flex flex-wrap items-center justify-between gap-2">
          <h2 className="metro-section-title">{t("reports.allReports")}</h2>
          <select
            value={filterStudent}
            onChange={(e) => setFilterStudent(e.target.value)}
            className="metro-input px-3 py-2 text-sm"
          >
            <option value="">{t("reports.filterAll")}</option>
            {students.map((s) => (
              <option key={s.id} value={s.id}>
                {s.name}
              </option>
            ))}
          </select>
        </div>

        {filterStudent && (
          <Link
            href={`/courses/${courseId}/reports/attendance?student=${filterStudent}`}
            className="mt-2 inline-block text-sm font-medium text-metro-blue hover:underline"
          >
            {t("reports.viewAttendance")} →
          </Link>
        )}

        {visibleReports.length === 0 ? (
          <p className="mt-4 border border-metro-border bg-metro-surface px-4 py-8 text-center text-metro-text-secondary">
            {t("reports.noReports")}
          </p>
        ) : (
          <div className="mt-3 space-y-3">
            {visibleReports.map((r) => (
              <div key={r.id} className="metro-card">
                <p className="text-sm font-medium text-metro-blue">{r.studentName}</p>
                <h3 className="mt-0.5 text-base font-semibold text-metro-text">
                  {r.lessonTitle ?? r.moduleTitle ?? t("reports.wholeCourse")}
                </h3>
                <p className="mt-0.5 text-sm text-metro-text-secondary">
                  {new Date(r.createdAt).toLocaleDateString()} ·{" "}
                  {format(t("reports.byAuthor"), { name: r.authorName })}
                </p>

                {editingId === r.id ? (
                  <div className="mt-3 space-y-2">
                    <textarea
                      value={editBody}
                      onChange={(e) => setEditBody(e.target.value)}
                      rows={4}
                      className="metro-input w-full px-3 py-2.5 text-sm"
                    />
                    <div className="flex gap-2">
                      <button
                        onClick={() => handleSaveEdit(r.id)}
                        disabled={pending || !editBody.trim()}
                        className="min-h-[44px] bg-metro-blue px-4 py-2 text-sm font-medium text-white hover:bg-metro-blue-hover disabled:opacity-50"
                      >
                        {t("reports.save")}
                      </button>
                      <button
                        onClick={() => setEditingId(null)}
                        className="min-h-[44px] border border-metro-border px-4 py-2 text-sm text-metro-text-secondary hover:bg-metro-blue-light"
                      >
                        {t("reports.cancel")}
                      </button>
                    </div>
                  </div>
                ) : (
                  <>
                    <p className="metro-body mt-3 whitespace-pre-wrap text-metro-text">
                      {r.body}
                    </p>
                    <div className="mt-3 flex gap-4">
                      <button
                        onClick={() => {
                          setEditingId(r.id);
                          setEditBody(r.body);
                        }}
                        className="text-sm font-medium text-metro-blue hover:underline"
                      >
                        {t("reports.edit")}
                      </button>
                      <button
                        onClick={() => setDeleteTarget(r)}
                        className="text-sm font-medium text-metro-error hover:underline"
                      >
                        {t("reports.delete")}
                      </button>
                    </div>
                  </>
                )}
              </div>
            ))}
          </div>
        )}
      </div>

      <ConfirmDialog
        open={deleteTarget !== null}
        title={t("reports.confirmDeleteTitle")}
        message={
          deleteTarget
            ? format(t("reports.confirmDeleteMsg"), { name: deleteTarget.studentName })
            : undefined
        }
        confirmLabel={t("reports.delete")}
        cancelLabel={t("reports.cancel")}
        danger
        pending={pending}
        onConfirm={handleDelete}
        onCancel={() => setDeleteTarget(null)}
      />
    </div>
  );
}
