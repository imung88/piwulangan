"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { useT } from "@/lib/i18n/useT";
import { useToast } from "@/components/ui/Toast";
import { enrollStudent, removeEnrollment } from "@/actions/courses";

interface StudentOption {
  id: string;
  name: string;
  email: string | null;
}

const MAX_RESULTS = 8;

export function AddStudentForm({
  courseId,
  candidates,
}: {
  courseId: string;
  candidates: StudentOption[];
}) {
  const router = useRouter();
  const t = useT();
  const [query, setQuery] = useState("");
  const [selected, setSelected] = useState<StudentOption | null>(null);
  const [open, setOpen] = useState(false);
  const [highlighted, setHighlighted] = useState(0);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const matches = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return candidates.slice(0, MAX_RESULTS);
    return candidates
      .filter(
        (s) =>
          s.name.toLowerCase().includes(q) ||
          (s.email ?? "").toLowerCase().includes(q)
      )
      .slice(0, MAX_RESULTS);
  }, [query, candidates]);

  if (candidates.length === 0) {
    return (
      <p className="text-sm text-metro-text-secondary">{t("courseManage.allEnrolled")}</p>
    );
  }

  function pick(s: StudentOption) {
    setSelected(s);
    setQuery(`${s.name}${s.email ? ` (${s.email})` : ""}`);
    setOpen(false);
  }

  async function handleAdd() {
    if (!selected) return;
    setLoading(true);
    setError(null);
    const res = await enrollStudent(courseId, selected.id);
    setLoading(false);
    if (!res.success) {
      setError(res.error);
      return;
    }
    setSelected(null);
    setQuery("");
    router.refresh();
  }

  return (
    <div className="flex items-start gap-2">
      <div className="relative w-full max-w-sm">
        <input
          type="text"
          value={query}
          placeholder={t("courseManage.searchStudent")}
          onChange={(e) => {
            setQuery(e.target.value);
            setSelected(null);
            setOpen(true);
            setHighlighted(0);
          }}
          onFocus={() => setOpen(true)}
          onBlur={() => {
            setTimeout(() => setOpen(false), 150);
          }}
          onKeyDown={(e) => {
            if (e.key === "ArrowDown") {
              e.preventDefault();
              setOpen(true);
              setHighlighted((h) => Math.min(h + 1, matches.length - 1));
            } else if (e.key === "ArrowUp") {
              e.preventDefault();
              setHighlighted((h) => Math.max(h - 1, 0));
            } else if (e.key === "Enter") {
              e.preventDefault();
              if (open && matches[highlighted]) pick(matches[highlighted]);
              else if (selected) handleAdd();
            } else if (e.key === "Escape") {
              setOpen(false);
            }
          }}
          className="metro-input w-full px-3 py-2 text-sm"
        />
        {open && (
          <ul className="absolute z-10 mt-1 w-full max-h-64 overflow-y-auto border border-metro-border bg-metro-surface shadow-md">
            {matches.length === 0 ? (
              <li className="px-3 py-2 text-sm text-metro-text-secondary">
                {t("courseManage.noMatches")}
              </li>
            ) : (
              matches.map((s, i) => (
                <li key={s.id}>
                  <button
                    type="button"
                    onMouseDown={(e) => e.preventDefault()}
                    onClick={() => pick(s)}
                    onMouseEnter={() => setHighlighted(i)}
                    className={`w-full px-3 py-2 text-left text-sm ${
                      i === highlighted ? "bg-metro-blue-light" : ""
                    }`}
                  >
                    <span className="font-medium">{s.name}</span>
                    {s.email && (
                      <span className="ml-2 text-xs text-metro-text-secondary">{s.email}</span>
                    )}
                  </button>
                </li>
              ))
            )}
          </ul>
        )}
      </div>
      <button
        onClick={handleAdd}
        disabled={!selected || loading}
        className="shrink-0 bg-metro-blue px-4 py-2 text-sm font-medium text-white hover:bg-metro-blue-hover disabled:opacity-50"
      >
        {t("courseManage.addStudentBtn")}
      </button>
      {error && <span className="self-center text-sm text-metro-error">{error}</span>}
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
  const t = useT();
  const toast = useToast();
  const [loading, setLoading] = useState(false);

  async function handleRemove() {
    const msg = t("courseManage.confirmRemove").replace("{name}", studentName);
    if (!confirm(msg)) return;
    setLoading(true);
    const res = await removeEnrollment(courseId, studentId);
    setLoading(false);
    if (!res.success) {
      toast.error(res.error);
      return;
    }
    router.refresh();
  }

  return (
    <button
      onClick={handleRemove}
      disabled={loading}
      className="text-sm font-medium text-metro-error hover:underline disabled:opacity-50"
    >
      {t("courseManage.remove")}
    </button>
  );
}
