"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { enrollStudent, removeEnrollment } from "@/actions/courses";

interface StudentOption {
  id: string;
  name: string;
  email: string;
}

export function AddStudentForm({
  courseId,
  candidates,
}: {
  courseId: string;
  candidates: StudentOption[];
}) {
  const router = useRouter();
  const [selected, setSelected] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (candidates.length === 0) {
    return (
      <p className="text-sm text-metro-text-secondary">All students are already enrolled.</p>
    );
  }

  async function handleAdd() {
    if (!selected) return;
    setLoading(true);
    setError(null);
    const res = await enrollStudent(courseId, selected);
    setLoading(false);
    if (res?.error) {
      setError(typeof res.error === "string" ? res.error : "Failed to enroll");
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
        <option value="">Select a student…</option>
        {candidates.map((s) => (
          <option key={s.id} value={s.id}>
            {s.name} ({s.email})
          </option>
        ))}
      </select>
      <button
        onClick={handleAdd}
        disabled={!selected || loading}
        className="bg-metro-blue px-4 py-2 text-sm font-medium text-white hover:bg-metro-blue-hover disabled:opacity-50"
      >
        Add Student
      </button>
      {error && <span className="text-sm text-metro-error">{error}</span>}
    </div>
  );
}

export function RemoveStudentButton({
  courseId,
  studentId,
  studentName,
}: {
  courseId: string;
  studentId: string;
  studentName: string;
}) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);

  async function handleRemove() {
    if (!confirm(`Remove ${studentName} from this course?`)) return;
    setLoading(true);
    await removeEnrollment(courseId, studentId);
    setLoading(false);
    router.refresh();
  }

  return (
    <button
      onClick={handleRemove}
      disabled={loading}
      className="text-sm font-medium text-metro-error hover:underline disabled:opacity-50"
    >
      Remove
    </button>
  );
}
