"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { useT } from "@/lib/i18n/useT";
import {
  updateLesson,
  deleteLesson,
  addResource,
  deleteResource,
  updateResource,
} from "@/actions/lessons";

type Resource = { id: string; title: string; url: string; type: string };

export function LessonEditForm({
  lessonId,
  courseId,
  initialTitle,
  initialDuration,
  initialContent,
  order,
  initialResources,
}: {
  lessonId: string;
  courseId: string;
  initialTitle: string;
  initialDuration: number | null;
  initialContent: string | null;
  order: number;
  initialResources: Resource[];
}) {
  const t = useT();
  const router = useRouter();
  const [expanded, setExpanded] = useState(false);
  const [title, setTitle] = useState(initialTitle);
  const [duration, setDuration] = useState(initialDuration?.toString() ?? "");
  const [content, setContent] = useState(initialContent ?? "");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [showGuide, setShowGuide] = useState(false);

  useEffect(() => {
    if (!showGuide) return;
    function onKeyDown(e: KeyboardEvent) {
      if (e.key === "Escape") setShowGuide(false);
    }
    document.addEventListener("keydown", onKeyDown);
    return () => document.removeEventListener("keydown", onKeyDown);
  }, [showGuide]);

  // Resource state
  const [resources, setResources] = useState(initialResources);
  const [newResTitle, setNewResTitle] = useState("");
  const [newResUrl, setNewResUrl] = useState("");
  const [newResType, setNewResType] = useState<"LINK" | "VIDEO" | "DOCUMENT">("LINK");
  const [editingResId, setEditingResId] = useState<string | null>(null);
  const [editResTitle, setEditResTitle] = useState("");
  const [editResUrl, setEditResUrl] = useState("");
  const [editResType, setEditResType] = useState<"LINK" | "VIDEO" | "DOCUMENT">("LINK");
  const [resourceError, setResourceError] = useState<string | null>(null);

  async function handleSave() {
    setSaving(true);
    setError(null);
    const formData = new FormData();
    formData.set("title", title);
    formData.set("content", content);
    if (duration) formData.set("duration", duration);
    try {
      const result: any = await updateLesson(lessonId, formData);
      setSaving(false);

      if (result?.error) {
        const msgs =
          typeof result.error === "string"
            ? result.error
            : Object.values(result.error).flat().join(", ");
        setError(msgs || t("schedule.saving"));
        return;
      }
      setExpanded(false);
      router.refresh();
    } catch {
      setSaving(false);
      setError(t("lesson.noContent"));
    }
  }

  function handleCancel() {
    setTitle(initialTitle);
    setDuration(initialDuration?.toString() ?? "");
    setContent(initialContent ?? "");
    setResources(initialResources);
    setError(null);
    setResourceError(null);
    setExpanded(false);
  }

  async function handleAddResource() {
    setResourceError(null);
    try {
      const result: any = await addResource(
        lessonId,
        newResTitle.trim(),
        newResUrl.trim(),
        newResType
      );
      if (result?.error) {
        setResourceError(
          typeof result.error === "string" ? result.error : "Failed to add resource"
        );
        return;
      }
      setNewResTitle("");
      setNewResUrl("");
      setNewResType("LINK");
      router.refresh();
    } catch {
      setResourceError("Failed to add resource");
    }
  }

  async function handleDeleteResource(resourceId: string) {
    if (!window.confirm(t("lesson.deleteResource"))) return;
    try {
      await deleteResource(resourceId);
      router.refresh();
    } catch {
      setResourceError("Failed to delete resource");
    }
  }

  function startEditResource(res: Resource) {
    setEditingResId(res.id);
    setEditResTitle(res.title);
    setEditResUrl(res.url);
    setEditResType(res.type as "LINK" | "VIDEO" | "DOCUMENT");
    setResourceError(null);
  }

  async function handleSaveResource() {
    if (!editingResId) return;
    setResourceError(null);
    try {
      const result: any = await updateResource(editingResId, {
        title: editResTitle.trim(),
        url: editResUrl.trim(),
        type: editResType,
      });
      if (result?.error) {
        setResourceError(
          typeof result.error === "string" ? result.error : "Failed to update resource"
        );
        return;
      }
      setEditingResId(null);
      router.refresh();
    } catch {
      setResourceError("Failed to update resource");
    }
  }

  function resourceTypeIcon(type: string) {
    switch (type) {
      case "VIDEO": return "▶";
      case "DOCUMENT": return "📄";
      default: return "🔗";
    }
  }

  if (expanded) {
    return (
      <div className="px-4 py-4 bg-metro-bg border-b border-metro-border">
        <div className="text-sm font-medium text-metro-text mb-3">
          {t("lesson.module").replace("{order}", String(order))}
        </div>
        <div className="space-y-3 max-w-2xl">
          {/* Title */}
          <div>
            <label className="block text-xs font-medium text-metro-text-secondary mb-1">
              {t("settings.titleLbl")}
            </label>
            <input
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              className="metro-input w-full px-3 py-2 text-sm"
            />
          </div>
          {/* Duration */}
          <div>
            <label className="block text-xs font-medium text-metro-text-secondary mb-1">
              {t("schedule.duration")}
            </label>
            <input
              type="number"
              value={duration}
              onChange={(e) => setDuration(e.target.value)}
              className="metro-input w-24 px-3 py-2 text-sm"
            />
          </div>
          {/* Content */}
          <div>
            <div className="flex items-center justify-between">
              <label className="block text-xs font-medium text-metro-text-secondary mb-1">
                {t("lesson.content")}
              </label>
                <button
                  type="button"
                  onClick={() => setShowGuide(true)}
                  className="text-xs text-metro-blue hover:underline mb-1"
                >
                  {t("lesson.markdownGuide")}
                </button>
            </div>
            <textarea
              value={content}
              onChange={(e) => setContent(e.target.value)}
              rows={12}
              className="metro-input w-full px-3 py-2 text-sm font-mono"
              placeholder={t("lesson.markdownContentPlaceholder")}
            />
          </div>

          {/* Resources */}
          <div className="border-t border-metro-border pt-3 mt-3">
            <label className="block text-xs font-medium text-metro-text-secondary mb-2">
              {t("lesson.resourcesLabel").replace("{n}", String(resources.length))}
            </label>

            {/* Existing resources */}
            {resources.length > 0 && (
              <div className="space-y-2 mb-3">
                {resources.map((res) => (
                  <div key={res.id}>
                    {editingResId === res.id ? (
                      /* Inline edit form */
                      <div className="border border-metro-blue bg-metro-surface p-3 space-y-2">
                        <div className="flex gap-2">
                          <input
                            value={editResTitle}
                            onChange={(e) => setEditResTitle(e.target.value)}
                            placeholder={t("lesson.title")}
                            className="metro-input flex-1 px-2 py-1 text-sm"
                          />
                          <select
                            value={editResType}
                            onChange={(e) => setEditResType(e.target.value as any)}
                            className="metro-input px-2 py-1 text-sm"
                          >
                            <option value="LINK">{t("lesson.link")}</option>
                            <option value="VIDEO">{t("lesson.video")}</option>
                            <option value="DOCUMENT">{t("lesson.document")}</option>
                          </select>
                        </div>
                        <input
                          value={editResUrl}
                          onChange={(e) => setEditResUrl(e.target.value)}
                          placeholder={t("lesson.url")}
                          className="metro-input w-full px-2 py-1 text-sm"
                        />
                        <div className="flex gap-2">
                          <button
                            onClick={handleSaveResource}
                            disabled={!editResTitle.trim() || !editResUrl.trim()}
                            className="bg-metro-blue px-3 py-1 text-xs font-medium text-white hover:bg-metro-blue-hover disabled:opacity-50"
                          >
                            {t("lesson.save")}
                          </button>
                          <button
                            onClick={() => setEditingResId(null)}
                            className="bg-metro-border px-3 py-1 text-xs font-medium text-metro-text hover:bg-metro-blue-light"
                          >
                            {t("lesson.cancel")}
                          </button>
                        </div>
                      </div>
                    ) : (
                      /* Display row */
                      <div className="flex items-center justify-between bg-metro-surface border border-metro-border px-3 py-2">
                        <div className="flex items-center gap-2 min-w-0">
                          <span className="text-sm">{resourceTypeIcon(res.type)}</span>
                          <div className="min-w-0">
                            <p className="text-sm font-medium truncate">{res.title}</p>
                            <p className="text-xs text-metro-text-secondary truncate">{res.url}</p>
                          </div>
                        </div>
                        <div className="flex items-center gap-2 shrink-0 ml-2">
                          <button
                            onClick={() => startEditResource(res)}
                            className="text-xs text-metro-blue hover:underline"
                          >
                            {t("lesson.editResource")}
                          </button>
                          <button
                            onClick={() => handleDeleteResource(res.id)}
                            className="text-xs text-metro-error hover:underline"
                          >
                            {t("lesson.deleteResource")}
                          </button>
                        </div>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )}

            {/* Add resource form */}
            {resources.length < 5 ? (
              <div className="border border-dashed border-metro-border p-3 space-y-2">
                <div className="flex gap-2">
                  <input
                    value={newResTitle}
                    onChange={(e) => setNewResTitle(e.target.value)}
                    placeholder={t("lesson.resourceTitle")}
                    className="metro-input flex-1 px-2 py-1 text-sm"
                  />
                  <select
                    value={newResType}
                    onChange={(e) => setNewResType(e.target.value as any)}
                    className="metro-input px-2 py-1 text-sm"
                  >
                    <option value="LINK">{t("lesson.link")}</option>
                    <option value="VIDEO">{t("lesson.video")}</option>
                    <option value="DOCUMENT">{t("lesson.document")}</option>
                  </select>
                </div>
                <div className="flex gap-2">
                  <input
                    value={newResUrl}
                    onChange={(e) => setNewResUrl(e.target.value)}
                    placeholder="https://..."
                    className="metro-input flex-1 px-2 py-1 text-sm"
                  />
                  <button
                    onClick={handleAddResource}
                    disabled={!newResTitle.trim() || !newResUrl.trim()}
                    className="bg-metro-border px-3 py-1 text-xs font-medium text-metro-text hover:bg-metro-blue-light disabled:opacity-50"
                  >
                    {t("lesson.addResource")}
                  </button>
                </div>
              </div>
            ) : (
              <p className="text-xs text-metro-text-secondary italic">{t("lesson.maxResources")}</p>
            )}

            {resourceError && (
              <p className="text-sm text-metro-error mt-2">{resourceError}</p>
            )}
          </div>

          {/* Markdown Guide Popup */}
          {showGuide && (
            <div
              className="fixed inset-0 z-50 bg-black/50 flex items-center justify-center"
              onClick={() => setShowGuide(false)}
            >
              <div
                className="bg-metro-surface max-w-lg w-full mx-4 p-6 max-h-[80vh] overflow-y-auto"
                onClick={(e) => e.stopPropagation()}
              >
                <div className="flex items-center justify-between mb-4">
                  <h3 className="text-sm font-semibold text-metro-text">Markdown Guide</h3>
                  <button
                    onClick={() => setShowGuide(false)}
                    className="text-metro-text-secondary hover:text-metro-text text-lg leading-none"
                  >
                    &times;
                  </button>
                </div>
                <div className="space-y-3 text-xs text-metro-text">
                  <div>
                    <p className="font-medium text-metro-text mb-1">Headings</p>
                    <div className="bg-metro-bg p-2 font-mono">
                      # Heading 1<br />
                      ## Heading 2<br />
                      ### Heading 3
                    </div>
                  </div>
                  <div>
                    <p className="font-medium text-metro-text mb-1">Text Formatting</p>
                    <div className="bg-metro-bg p-2 font-mono">
                      **bold text**<br />
                      *italic text*<br />
                      `inline code`
                    </div>
                  </div>
                  <div>
                    <p className="font-medium text-metro-text mb-1">Blockquote</p>
                    <div className="bg-metro-bg p-2 font-mono">
                      &gt; quoted text
                    </div>
                  </div>
                  <div>
                    <p className="font-medium text-metro-text mb-1">Lists</p>
                    <div className="bg-metro-bg p-2 font-mono">
                      - unordered item<br />
                      - another item<br />
                      <br />
                      1. ordered item<br />
                      2. another item
                    </div>
                  </div>
                  <div>
                    <p className="font-medium text-metro-text mb-1">Paragraphs &amp; Line Breaks</p>
                    <div className="bg-metro-bg p-2 font-mono">
                      Separate paragraphs with a blank line.<br />
                      Single newlines become line breaks.
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Save / Cancel */}
          <div className="flex items-center gap-3 pt-1">
            <button
              onClick={handleSave}
              disabled={saving || !title.trim()}
              className="bg-metro-blue px-4 py-2 text-sm font-medium text-white hover:bg-metro-blue-hover disabled:opacity-50"
            >
              {saving ? t("lesson.saving") : t("lesson.save")}
            </button>
            <button
              onClick={handleCancel}
              disabled={saving}
              className="bg-metro-border px-4 py-2 text-sm font-medium text-metro-text hover:bg-metro-blue-light disabled:opacity-50"
            >
              {t("lesson.cancel")}
            </button>
            {error && <span className="text-sm text-metro-error">{error}</span>}
          </div>
        </div>
      </div>
    );
  }

  // Collapsed: normal lesson row
  return (
    <div className="flex items-center justify-between px-4 py-3">
      <div>
        <p className="text-sm font-medium">
          {order}. {title}
        </p>
        <div className="flex items-center gap-3 mt-1">
          {initialDuration && (
            <span className="text-xs text-metro-text-secondary">
              ~{initialDuration} min
            </span>
          )}
          {resources.length > 0 && (
            <span className="text-xs text-metro-text-secondary">
              📎 {resources.length} resources
            </span>
          )}
          <span className="text-xs text-metro-text-secondary">
            {initialContent
              ? `${initialContent.length} chars`
              : "No content"}
          </span>
        </div>
      </div>
      <div className="flex items-center gap-2">
        <button
          onClick={() => setExpanded(true)}
          className="text-xs text-metro-blue hover:underline"
        >
          {t("lesson.editResource")}
        </button>
        <Link
          href={`/courses/${courseId}/lessons/${lessonId}`}
          className="text-xs text-metro-blue hover:underline"
        >
          {t("lesson.view")}
        </Link>
        <form
          action={async () => {
            await deleteLesson(lessonId);
          }}
        >
          <button
            type="submit"
            className="text-xs text-metro-error hover:underline"
          >
            Delete
          </button>
        </form>
      </div>
    </div>
  );
}
