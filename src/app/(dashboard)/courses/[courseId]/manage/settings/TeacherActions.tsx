"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useT, format } from "@/lib/i18n/useT";
import ConfirmDialog from "@/components/ui/ConfirmDialog";
import { useToast } from "@/components/ui/Toast";
import {
  addCoInstructor,
  removeCoInstructor,
  transferOwnership,
  deleteCourse,
} from "@/actions/courses";

interface InstructorOption {
  id: string;
  name: string;
  email: string | null;
}

export function AddCoInstructorForm({
  courseId,
  candidates,
}: {
  courseId: string;
  candidates: InstructorOption[];
}) {
  const router = useRouter();
  const t = useT();
  const [selected, setSelected] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (candidates.length === 0) {
    return (
      <p className="text-sm text-metro-text-secondary">{t("settings.noTeacherCandidates")}</p>
    );
  }

  async function handleAdd() {
    if (!selected) return;
    setLoading(true);
    setError(null);
    const res = await addCoInstructor(courseId, selected);
    setLoading(false);
    if (!res.success) {
      setError(res.error);
      return;
    }
    setSelected("");
    router.refresh();
  }

  return (
    <div className="flex items-center gap-2">
      <select
        value={selected}
        onChange={(e) => setSelected(e.target.value)}
        className="metro-input px-3 py-2 text-sm"
      >
        <option value="">{t("settings.selectTeacher")}</option>
        {candidates.map((u) => (
          <option key={u.id} value={u.id}>
            {u.name} ({u.email})
          </option>
        ))}
      </select>
      <button
        onClick={handleAdd}
        disabled={!selected || loading}
        className="bg-metro-blue px-4 py-2 text-sm font-medium text-white hover:bg-metro-blue-hover disabled:opacity-50"
      >
        {t("settings.addTeacherBtn")}
      </button>
      {error && <span className="text-sm text-metro-error">{error}</span>}
    </div>
  );
}

export function RemoveCoInstructorButton({
  courseId,
  instructorId,
  instructorName,
}: {
  courseId: string;
  instructorId: string;
  instructorName: string;
}) {
  const router = useRouter();
  const t = useT();
  const [loading, setLoading] = useState(false);
  const [confirming, setConfirming] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleRemove() {
    setLoading(true);
    setError(null);
    const res = await removeCoInstructor(courseId, instructorId);
    setLoading(false);
    setConfirming(false);
    if (!res.success) {
      setError(res.error);
      return;
    }
    router.refresh();
  }

  return (
    <>
      <button
        onClick={() => setConfirming(true)}
        disabled={loading}
        className="min-h-[44px] px-3 text-sm font-medium text-metro-error hover:underline disabled:opacity-50"
      >
        {t("settings.removeTeacher")}
      </button>
      <ConfirmDialog
        open={confirming}
        danger
        pending={loading}
        title={format(t("settings.confirmRemoveTeacher"), { name: instructorName })}
        confirmLabel={t("settings.removeTeacher")}
        cancelLabel={t("common.cancel")}
        onConfirm={handleRemove}
        onCancel={() => setConfirming(false)}
      />
      {error && <p className="text-sm text-metro-error">{error}</p>}
    </>
  );
}

export function TransferOwnershipForm({
  courseId,
  candidates,
}: {
  courseId: string;
  candidates: InstructorOption[];
}) {
  const router = useRouter();
  const t = useT();
  const [selected, setSelected] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [confirming, setConfirming] = useState(false);

  if (candidates.length === 0) {
    return (
      <p className="text-sm text-metro-text-secondary">{t("settings.noTeacherCandidates")}</p>
    );
  }

  async function handleTransfer() {
    setLoading(true);
    setError(null);
    const res = await transferOwnership(courseId, selected);
    setLoading(false);
    setConfirming(false);
    if (!res.success) {
      setError(res.error);
      return;
    }
    setSelected("");
    router.refresh();
  }

  const selectedName = candidates.find((c) => c.id === selected)?.name ?? "";

  return (
    <div className="flex items-center gap-2">
      <select
        value={selected}
        onChange={(e) => setSelected(e.target.value)}
        className="metro-input px-3 py-2 text-sm"
      >
        <option value="">{t("settings.selectTeacher")}</option>
        {candidates.map((u) => (
          <option key={u.id} value={u.id}>
            {u.name} ({u.email})
          </option>
        ))}
      </select>
      <button
        onClick={() => setConfirming(true)}
        disabled={!selected || loading}
        className="bg-metro-orange px-4 py-2 text-sm font-medium text-white hover:opacity-90 disabled:opacity-50"
      >
        {t("settings.transferBtn")}
      </button>
      {error && <span className="text-sm text-metro-error">{error}</span>}
      <ConfirmDialog
        open={confirming}
        danger
        pending={loading}
        title={format(t("settings.confirmTransfer"), { name: selectedName })}
        message={t("settings.transferDesc")}
        confirmLabel={t("settings.transferBtn")}
        cancelLabel={t("common.cancel")}
        onConfirm={handleTransfer}
        onCancel={() => setConfirming(false)}
      />
    </div>
  );
}

export function DeleteCourseButton({
  courseId,
  courseTitle,
}: {
  courseId: string;
  courseTitle: string;
}) {
  const router = useRouter();
  const t = useT();
  const toast = useToast();
  const [confirming, setConfirming] = useState(false);
  const [loading, setLoading] = useState(false);

  async function handleDelete() {
    setLoading(true);
    const res = await deleteCourse(courseId);
    setLoading(false);
    setConfirming(false);
    if (!res.success) {
      toast.error(res.error);
      return;
    }
    toast.success(t("settings.deleted"));
    router.push("/courses");
  }

  return (
    <>
      <button
        onClick={() => setConfirming(true)}
        className="min-h-[44px] bg-metro-error px-4 py-2 text-sm font-bold text-white hover:opacity-90"
      >
        {t("settings.delete")}
      </button>
      <ConfirmDialog
        open={confirming}
        danger
        pending={loading}
        title={format(t("settings.confirmDelete"), { title: courseTitle })}
        message={t("settings.dangerDesc")}
        confirmLabel={t("settings.delete")}
        cancelLabel={t("common.cancel")}
        onConfirm={handleDelete}
        onCancel={() => setConfirming(false)}
      />
    </>
  );
}
