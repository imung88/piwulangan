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
      <p className="text-sm text-gray-400">All students are already enrolled.</p>
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
        className="rounded-md border border-gray-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none"
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
        className="rounded-md bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700 disabled:opacity-50"
      >
        Add Student
      </button>
      {error && <span className="text-sm text-red-600">{error}</span>}
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
      className="text-sm font-medium text-red-600 hover:text-red-700 disabled:opacity-50"
    >
      Remove
    </button>
  );
}
