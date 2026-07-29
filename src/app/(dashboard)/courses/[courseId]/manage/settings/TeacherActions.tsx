"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useT } from "@/lib/i18n/useT";
import {
  addCoInstructor,
  removeCoInstructor,
  transferOwnership,
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
    if (res?.error) {
      setError(typeof res.error === "string" ? res.error : t("settings.failedTeacherAction"));
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

  async function handleRemove() {
    const msg = t("settings.confirmRemoveTeacher").replace("{name}", instructorName);
    if (!confirm(msg)) return;
    setLoading(true);
    await removeCoInstructor(courseId, instructorId);
    setLoading(false);
    router.refresh();
  }

  return (
    <button
      onClick={handleRemove}
      disabled={loading}
      className="text-sm font-medium text-metro-error hover:underline disabled:opacity-50"
    >
      {t("settings.removeTeacher")}
    </button>
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

  if (candidates.length === 0) {
    return (
      <p className="text-sm text-metro-text-secondary">{t("settings.noTeacherCandidates")}</p>
    );
  }

  async function handleTransfer() {
    if (!selected) return;
    const name = candidates.find((c) => c.id === selected)?.name ?? "";
    const msg = t("settings.confirmTransfer").replace("{name}", name);
    if (!confirm(msg)) return;
    setLoading(true);
    setError(null);
    const res = await transferOwnership(courseId, selected);
    setLoading(false);
    if (res?.error) {
      setError(typeof res.error === "string" ? res.error : t("settings.failedTeacherAction"));
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
        onClick={handleTransfer}
        disabled={!selected || loading}
        className="bg-metro-orange px-4 py-2 text-sm font-medium text-white hover:opacity-90 disabled:opacity-50"
      >
        {t("settings.transferBtn")}
      </button>
      {error && <span className="text-sm text-metro-error">{error}</span>}
    </div>
  );
}
