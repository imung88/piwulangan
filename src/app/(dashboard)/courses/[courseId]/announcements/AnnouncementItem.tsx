"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useT, format } from "@/lib/i18n/useT";
import {
  updateAnnouncement,
  deleteAnnouncement,
  togglePin,
} from "@/actions/announcements";

export function AnnouncementItem({
  id,
  title,
  body,
  pinned,
  authorName,
  dateLabel,
  canManage,
}: {
  id: string;
  title: string;
  body: string;
  pinned: boolean;
  authorName: string;
  dateLabel: string;
  canManage: boolean;
}) {
  const router = useRouter();
  const t = useT();
  const [editing, setEditing] = useState(false);
  const [editTitle, setEditTitle] = useState("");
  const [editBody, setEditBody] = useState("");
  const [editPinned, setEditPinned] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  function startEdit() {
    setEditTitle(title);
    setEditBody(body);
    setEditPinned(pinned);
    setError(null);
    setEditing(true);
  }

  async function handleSave(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    setError(null);
    const fd = new FormData();
    fd.set("title", editTitle);
    fd.set("body", editBody);
    if (editPinned) fd.set("pinned", "on");
    let res;
    try {
      res = await updateAnnouncement(id, fd);
    } catch {
      setBusy(false);
      setError(t("courseManage.failedUpdate"));
      return;
    }
    setBusy(false);
    if (res && "error" in res && res.error) {
      const messages = Object.values(res.error).flat().filter(Boolean).join(", ");
      setError(messages || t("courseManage.failedUpdate"));
      return;
    }
    setEditing(false);
    router.refresh();
  }

  async function handleTogglePin() {
    setBusy(true);
    await togglePin(id);
    setBusy(false);
    router.refresh();
  }

  async function handleDelete() {
    if (!confirm(format(t("courseManage.confirmDelete"), { title }))) return;
    setBusy(true);
    await deleteAnnouncement(id);
    setBusy(false);
    router.refresh();
  }

  if (editing) {
    return (
      <form
        onSubmit={handleSave}
        className={`metro-card space-y-3 ${pinned ? "metro-card-accent" : ""}`}
      >
        <div>
          <label className="block text-sm font-medium text-metro-text">
            {t("courseManage.title")}
          </label>
          <input
            value={editTitle}
            onChange={(e) => setEditTitle(e.target.value)}
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
            value={editBody}
            onChange={(e) => setEditBody(e.target.value)}
            required
            rows={4}
            className="metro-input mt-1 block w-full px-3 py-2 text-sm"
          />
        </div>
        <div className="flex items-center gap-2">
          <input
            type="checkbox"
            checked={editPinned}
            onChange={(e) => setEditPinned(e.target.checked)}
            id={`pinned-${id}`}
            className="border-metro-border text-metro-blue"
          />
          <label htmlFor={`pinned-${id}`} className="text-sm text-metro-text">
            {t("courseManage.pinAnnouncement")}
          </label>
        </div>
        <div className="flex items-center gap-2">
          <button
            type="submit"
            disabled={busy}
            className="bg-metro-blue px-4 py-2 text-sm font-medium text-white hover:bg-metro-blue-hover disabled:opacity-50"
          >
            {t("courseManage.save")}
          </button>
          <button
            type="button"
            onClick={() => setEditing(false)}
            className="border-2 border-metro-border px-4 py-2 text-sm font-medium text-metro-text hover:bg-metro-bg"
          >
            {t("courseManage.cancel")}
          </button>
          {error && <span className="text-sm text-metro-error">{error}</span>}
        </div>
      </form>
    );
  }

  return (
    <div className={`metro-card ${pinned ? "metro-card-accent" : ""}`}>
      <div className="flex items-start justify-between">
        <div className="flex-1">
          <div className="flex items-center gap-2">
            {pinned && <span className="text-xs text-metro-blue">📌</span>}
            <h3 className="font-medium">{title}</h3>
          </div>
          <p className="mt-2 text-sm text-metro-text-secondary whitespace-pre-wrap">
            {body}
          </p>
          <p className="mt-2 text-xs text-metro-text-secondary">
            {authorName} · {dateLabel}
          </p>
        </div>
        {canManage && (
          <div className="ml-4 flex items-center gap-2">
            <button
              onClick={handleTogglePin}
              disabled={busy}
              title={pinned ? t("courseManage.unpin") : t("courseManage.pin")}
              className="text-sm text-metro-text-secondary hover:text-metro-blue disabled:opacity-50"
            >
              {pinned ? "📌" : "📍"}
            </button>
            <button
              onClick={startEdit}
              disabled={busy}
              className="text-sm font-medium text-metro-blue hover:underline disabled:opacity-50"
            >
              {t("courseManage.edit")}
            </button>
            <button
              onClick={handleDelete}
              disabled={busy}
              className="text-sm font-medium text-metro-error hover:underline disabled:opacity-50"
            >
              {t("courseManage.delete")}
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
