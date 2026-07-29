"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useT } from "@/lib/i18n/useT";
import { createModule, createLesson } from "@/actions/lessons";

export function AddModuleForm({ courseId }: { courseId: string }) {
  const router = useRouter();
  const t = useT();
  const [title, setTitle] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!title.trim()) return;
    setLoading(true);
    setError(null);
    try {
      await createModule(courseId, title.trim());
    } catch {
      setLoading(false);
      setError(t("content.failedAdd"));
      return;
    }
    setLoading(false);
    setTitle("");
    router.refresh();
  }

  return (
    <form onSubmit={handleSubmit} className="flex flex-wrap items-center gap-2">
      <input
        value={title}
        onChange={(e) => setTitle(e.target.value)}
        placeholder={t("content.newModuleTitle")}
        required
        className="metro-input flex-1 px-3 py-2 text-sm"
      />
      <button
        type="submit"
        disabled={loading || !title.trim()}
        className="bg-metro-blue px-4 py-2 text-sm font-medium text-white hover:bg-metro-blue-hover disabled:opacity-50"
      >
        {t("content.addModule")}
      </button>
      {error && <span className="w-full text-sm text-metro-error">{error}</span>}
    </form>
  );
}

export function AddLessonForm({ moduleId }: { moduleId: string }) {
  const router = useRouter();
  const t = useT();
  const [title, setTitle] = useState("");
  const [duration, setDuration] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!title.trim()) return;
    setLoading(true);
    setError(null);
    const fd = new FormData();
    fd.set("title", title.trim());
    if (duration) fd.set("duration", duration);
    let res;
    try {
      res = await createLesson(moduleId, fd);
    } catch {
      setLoading(false);
      setError(t("content.failedAdd"));
      return;
    }
    setLoading(false);
    if (res && "error" in res && res.error) {
      const messages = Object.values(res.error).flat().filter(Boolean).join(", ");
      setError(messages || t("content.failedAdd"));
      return;
    }
    setTitle("");
    setDuration("");
    router.refresh();
  }

  return (
    <form onSubmit={handleSubmit} className="flex flex-wrap gap-2 w-full">
      <input
        value={title}
        onChange={(e) => setTitle(e.target.value)}
        placeholder={t("content.newLessonTitle")}
        required
        className="metro-input flex-1 px-3 py-1.5 text-sm"
      />
      <input
        value={duration}
        onChange={(e) => setDuration(e.target.value)}
        type="number"
        placeholder={t("content.duration")}
        className="metro-input w-20 px-3 py-1.5 text-sm"
      />
      <button
        type="submit"
        disabled={loading || !title.trim()}
        className="bg-metro-border px-3 py-1.5 text-sm font-medium text-metro-text hover:bg-metro-blue-light disabled:opacity-50"
      >
        {t("content.addLesson")}
      </button>
      {error && <span className="w-full text-sm text-metro-error">{error}</span>}
    </form>
  );
}
