/**
 * @module actions/lessons
 * @overview Server actions for managing course modules, lessons, and learning resources.
 * @responsibilities
 *   - CRUD operations for course modules and lessons with ordering
 *   - Management of learning resources (links, videos, documents) with URL normalization
 * @exports
 *   - `createModule` / `updateModule` / `deleteModule`: Module management
 *   - `createLesson` / `updateLesson` / `deleteLesson`: Lesson management
 *   - `addResource` / `updateResource` / `deleteResource`: Resource management
 */
"use server";

import { z } from "zod";
import { db } from "@/lib/db";
import { serverT } from "@/lib/i18n/serverT";
import { requireCourseManager } from "@/lib/authHelpers";
import { revalidatePath } from "next/cache";
import type { ActionResult } from "@/types/errors";

// Resource URLs must be absolute web links; a bare "example.com/file" would
// otherwise render as a relative link pointing into the app itself.
function normalizeResourceUrl(raw: string): string | null {
  let url = raw.trim();
  if (!url) return null;
  if (!/^[a-zA-Z][a-zA-Z0-9+.-]*:/.test(url)) {
    url = `https://${url.replace(/^\/+/, "")}`;
  }
  try {
    const parsed = new URL(url);
    if (parsed.protocol !== "http:" && parsed.protocol !== "https:") return null;
    if (!parsed.hostname.includes(".")) return null;
    return parsed.toString();
  } catch {
    return null;
  }
}

// ─── Modules ───

export async function createModule(courseId: string, title: string): Promise<ActionResult> {
  const cm = await requireCourseManager(courseId);
  if (!cm.success) return cm;

  const maxOrder = await db.module.aggregate({
    where: { courseId },
    _max: { order: true },
  });

  await db.module.create({
    data: {
      title,
      order: (maxOrder._max.order || 0) + 1,
      courseId,
    },
  });

  revalidatePath(`/courses/${courseId}/manage/content`);
  return { success: true };
}

export async function updateModule(moduleId: string, title: string): Promise<ActionResult> {
  const mod = await db.module.findUnique({ where: { id: moduleId } });
  if (!mod) return { success: false, error: await serverT("errors.moduleNotFound") };

  const cm = await requireCourseManager(mod.courseId);
  if (!cm.success) return cm;

  await db.module.update({
    where: { id: moduleId },
    data: { title },
  });

  revalidatePath(`/courses/${mod.courseId}/manage/content`);
  return { success: true };
}

export async function deleteModule(moduleId: string): Promise<ActionResult> {
  const mod = await db.module.findUnique({ where: { id: moduleId } });
  if (!mod) return { success: false, error: await serverT("errors.moduleNotFound") };

  const cm = await requireCourseManager(mod.courseId);
  if (!cm.success) return cm;

  await db.module.delete({ where: { id: moduleId } });

  revalidatePath(`/courses/${mod.courseId}/manage/content`);
  return { success: true };
}

// ─── Lessons ───

const lessonSchema = z.object({
  title: z.string().min(2).max(200),
  content: z.string().optional(),
  duration: z.coerce.number().int().positive().optional(),
});

export async function createLesson(
  moduleId: string,
  formData: FormData
): Promise<ActionResult<{ lessonId: string }>> {
  const mod = await db.module.findUnique({ where: { id: moduleId } });
  if (!mod) return { success: false, error: await serverT("errors.moduleNotFound") };

  const cm = await requireCourseManager(mod.courseId);
  if (!cm.success) return cm;

  const parsed = lessonSchema.safeParse({
    title: formData.get("title"),
    content: formData.get("content") || undefined,
    duration: formData.get("duration") || undefined,
  });

  if (!parsed.success) {
    return {
      success: false,
      error: await serverT("errors.validationFailed"),
      fieldErrors: parsed.error.flatten().fieldErrors,
    };
  }

  const maxOrder = await db.lesson.aggregate({
    where: { moduleId },
    _max: { order: true },
  });

  const lesson = await db.lesson.create({
    data: {
      title: parsed.data.title,
      content: parsed.data.content || null,
      duration: parsed.data.duration || null,
      order: (maxOrder._max.order || 0) + 1,
      moduleId,
    },
  });

  revalidatePath(`/courses/${mod.courseId}/manage/content`);
  return { success: true, data: { lessonId: lesson.id } };
}

export async function updateLesson(lessonId: string, formData: FormData): Promise<ActionResult> {
  const lesson = await db.lesson.findUnique({
    where: { id: lessonId },
    include: { module: { select: { courseId: true } } },
  });
  if (!lesson) return { success: false, error: await serverT("errors.lessonNotFound") };

  const cm = await requireCourseManager(lesson.module.courseId);
  if (!cm.success) return cm;

  const parsed = lessonSchema.safeParse({
    title: formData.get("title"),
    content: formData.get("content") || undefined,
    duration: formData.get("duration") || undefined,
  });

  if (!parsed.success) {
    return {
      success: false,
      error: await serverT("errors.validationFailed"),
      fieldErrors: parsed.error.flatten().fieldErrors,
    };
  }

  await db.lesson.update({
    where: { id: lessonId },
    data: {
      title: parsed.data.title,
      content: parsed.data.content || null,
      duration: parsed.data.duration || null,
    },
  });

  const courseId = lesson.module.courseId;
  revalidatePath(`/courses/${courseId}/manage/content`);
  revalidatePath(`/courses/${courseId}/lessons/${lessonId}`);
  return { success: true };
}

export async function deleteLesson(lessonId: string): Promise<ActionResult> {
  const lesson = await db.lesson.findUnique({
    where: { id: lessonId },
    include: { module: { select: { courseId: true } } },
  });
  if (!lesson) return { success: false, error: await serverT("errors.lessonNotFound") };

  const cm = await requireCourseManager(lesson.module.courseId);
  if (!cm.success) return cm;

  const courseId = lesson.module.courseId;
  await db.lesson.delete({ where: { id: lessonId } });

  revalidatePath(`/courses/${courseId}/manage/content`);
  return { success: true };
}

// ─── Resources ───

export async function addResource(
  lessonId: string,
  title: string,
  url: string,
  type?: "LINK" | "VIDEO" | "DOCUMENT"
): Promise<ActionResult> {
  const lesson = await db.lesson.findUnique({
    where: { id: lessonId },
    include: { module: { select: { courseId: true } } },
  });
  if (!lesson) return { success: false, error: await serverT("errors.lessonNotFound") };

  const cm = await requireCourseManager(lesson.module.courseId);
  if (!cm.success) return cm;

  const count = await db.resource.count({ where: { lessonId } });
  if (count >= 5) {
    return { success: false, error: await serverT("errors.maxResources") };
  }

  const normalizedUrl = normalizeResourceUrl(url);
  if (!normalizedUrl) {
    return { success: false, error: await serverT("errors.invalidUrl") };
  }

  await db.resource.create({
    data: { title, url: normalizedUrl, type: type || "LINK", lessonId },
  });

  const courseId = lesson.module.courseId;
  revalidatePath(`/courses/${courseId}/manage/content`);
  revalidatePath(`/courses/${courseId}/lessons/${lessonId}`);
  return { success: true };
}

export async function deleteResource(resourceId: string): Promise<ActionResult> {
  const resource = await db.resource.findUnique({
    where: { id: resourceId },
    include: { lesson: { select: { moduleId: true, module: { select: { courseId: true } } } } },
  });
  if (!resource) return { success: false, error: await serverT("errors.resourceNotFound") };

  const cm = await requireCourseManager(resource.lesson.module.courseId);
  if (!cm.success) return cm;

  const courseId = resource.lesson.module.courseId;
  await db.resource.delete({ where: { id: resourceId } });

  revalidatePath(`/courses/${courseId}/manage/content`);
  revalidatePath(`/courses/${courseId}/lessons/${resource.lessonId}`);
  return { success: true };
}

export async function updateResource(
  resourceId: string,
  data: { title: string; url: string; type?: "LINK" | "VIDEO" | "DOCUMENT" }
): Promise<ActionResult> {
  const resource = await db.resource.findUnique({
    where: { id: resourceId },
    include: { lesson: { select: { moduleId: true, module: { select: { courseId: true } } } } },
  });
  if (!resource) return { success: false, error: await serverT("errors.resourceNotFound") };

  const cm = await requireCourseManager(resource.lesson.module.courseId);
  if (!cm.success) return cm;

  const normalizedUrl = normalizeResourceUrl(data.url);
  if (!normalizedUrl) {
    return { success: false, error: await serverT("errors.invalidUrl") };
  }

  await db.resource.update({
    where: { id: resourceId },
    data: {
      title: data.title,
      url: normalizedUrl,
      type: data.type || "LINK",
    },
  });

  const courseId = resource.lesson.module.courseId;
  revalidatePath(`/courses/${courseId}/manage/content`);
  revalidatePath(`/courses/${courseId}/lessons/${resource.lessonId}`);
  return { success: true };
}
