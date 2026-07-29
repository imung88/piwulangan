"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useT } from "@/lib/i18n/useT";
import { createAnnouncement } from "@/actions/announcements";

export function CreateAnnouncementForm({ courseId }: { courseId: string }) {
  const router = useRouter();
  const t = useT();
  const [title, setTitle] = useState("");
  const [body, setBody] = useState("");
  const [pinned, setPinned] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError(null);
    const fd = new FormData();
    fd.set("title", title);
    fd.set("body", body);
    if (pinned) fd.set("pinned", "on");
    let res;
    try {
      res = await createAnnouncement(courseId, fd);
    } catch {
      setLoading(false);
      setError(t("courseManage.failedAnnouncement"));
      return;
    }
    setLoading(false);
    if (res && "error" in res && res.error) {
      const messages = Object.values(res.error).flat().filter(Boolean).join(", ");
      setError(messages || t("courseManage.failedAnnouncement"));
      return;
    }
    setTitle("");
    setBody("");
    setPinned(false);
    router.refresh();
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div>
        <label className="block text-sm font-medium text-metro-text">
          {t("courseManage.title")}
        </label>
        <input
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          required
          maxLength={200}
          className="metro-input mt-1 block w-full px-3 py-2 text-sm"
        />
      </div>
      <div>
        <label className="block text-sm font-medium text-metro-text">
          {t("courseManage.body")}
        </label>
        <textarea
          value={body}
          onChange={(e) => setBody(e.target.value)}
          required
          rows={4}
          className="metro-input mt-1 block w-full px-3 py-2 text-sm"
        />
      </div>
      <div className="flex items-center gap-2">
        <input
          type="checkbox"
          checked={pinned}
          onChange={(e) => setPinned(e.target.checked)}
          id="pinned"
          className="border-metro-border text-metro-blue"
        />
        <label htmlFor="pinned" className="text-sm text-metro-text">
          {t("courseManage.pinAnnouncement")}
        </label>
      </div>
      <div className="flex items-center gap-3">
        <button
          type="submit"
          disabled={loading}
          className="bg-metro-blue px-4 py-2 text-sm font-medium text-white hover:bg-metro-blue-hover disabled:opacity-50"
        >
          {t("courseManage.createAnnouncement")}
        </button>
        {error && <span className="text-sm text-metro-error">{error}</span>}
      </div>
    </form>
  );
}
