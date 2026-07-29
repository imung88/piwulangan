"use server";

import { z } from "zod";
import { db } from "@/lib/db";
import { auth } from "@/lib/auth";
import { serverT } from "@/lib/i18n/serverT";
import { canManageCourse } from "@/lib/coursePerms";
import { revalidatePath } from "next/cache";

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

export async function createModule(courseId: string, title: string) {
  const session = await auth();
  if (!session?.user) throw new Error("Not authenticated");

  const course = await db.course.findUnique({ where: { id: courseId } });
  if (!course) throw new Error("Course not found");

  const userId = (session.user as any).id;
  const role = (session.user as any).role;
  if (!(await canManageCourse(userId, role, course))) {
    throw new Error("Not authorized");
  }

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

export async function updateModule(moduleId: string, title: string) {
  const session = await auth();
  if (!session?.user) throw new Error("Not authenticated");

  const mod = await db.module.findUnique({
    where: { id: moduleId },
    include: { course: true },
  });
  if (!mod) throw new Error("Module not found");

  const userId = (session.user as any).id;
  const role = (session.user as any).role;
  if (!(await canManageCourse(userId, role, mod.course))) {
    throw new Error("Not authorized");
  }

  await db.module.update({
    where: { id: moduleId },
    data: { title },
  });

  revalidatePath(`/courses/${mod.courseId}/manage/content`);
  return { success: true };
}

export async function deleteModule(moduleId: string) {
  const session = await auth();
  if (!session?.user) throw new Error("Not authenticated");

  const mod = await db.module.findUnique({
    where: { id: moduleId },
    include: { course: true },
  });
  if (!mod) throw new Error("Module not found");

  const userId = (session.user as any).id;
  const role = (session.user as any).role;
  if (!(await canManageCourse(userId, role, mod.course))) {
    throw new Error("Not authorized");
  }

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

export async function createLesson(moduleId: string, formData: FormData) {
  const session = await auth();
  if (!session?.user) throw new Error("Not authenticated");

  const mod = await db.module.findUnique({
    where: { id: moduleId },
    include: { course: true },
  });
  if (!mod) throw new Error("Module not found");

  const userId = (session.user as any).id;
  const role = (session.user as any).role;
  if (!(await canManageCourse(userId, role, mod.course))) {
    throw new Error("Not authorized");
  }

  const parsed = lessonSchema.safeParse({
    title: formData.get("title"),
    content: formData.get("content") || undefined,
    duration: formData.get("duration") || undefined,
  });

  if (!parsed.success) {
    return { error: parsed.error.flatten().fieldErrors };
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
  return { success: true, lessonId: lesson.id };
}

export async function updateLesson(lessonId: string, formData: FormData) {
  const session = await auth();
  if (!session?.user) throw new Error("Not authenticated");

  const lesson = await db.lesson.findUnique({
    where: { id: lessonId },
    include: { module: { include: { course: true } } },
  });
  if (!lesson) throw new Error("Lesson not found");

  const userId = (session.user as any).id;
  const role = (session.user as any).role;
  if (!(await canManageCourse(userId, role, lesson.module.course))) {
    throw new Error("Not authorized");
  }

  const parsed = lessonSchema.safeParse({
    title: formData.get("title"),
    content: formData.get("content") || undefined,
    duration: formData.get("duration") || undefined,
  });

  if (!parsed.success) {
    return { error: parsed.error.flatten().fieldErrors };
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

export async function deleteLesson(lessonId: string) {
  const session = await auth();
  if (!session?.user) throw new Error("Not authenticated");

  const lesson = await db.lesson.findUnique({
    where: { id: lessonId },
    include: { module: { include: { course: true } } },
  });
  if (!lesson) throw new Error("Lesson not found");

  const userId = (session.user as any).id;
  const role = (session.user as any).role;
  if (!(await canManageCourse(userId, role, lesson.module.course))) {
    throw new Error("Not authorized");
  }

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
) {
  const session = await auth();
  if (!session?.user) throw new Error("Not authenticated");

  const lesson = await db.lesson.findUnique({
    where: { id: lessonId },
    include: { module: { include: { course: true } } },
  });
  if (!lesson) throw new Error("Lesson not found");

  const userId = (session.user as any).id;
  const role = (session.user as any).role;
  if (!(await canManageCourse(userId, role, lesson.module.course))) {
    throw new Error("Not authorized");
  }

  const count = await db.resource.count({ where: { lessonId } });
  if (count >= 5) {
    return { error: await serverT("errors.maxResources") };
  }

  const normalizedUrl = normalizeResourceUrl(url);
  if (!normalizedUrl) {
    return { error: await serverT("errors.invalidUrl") };
  }

  await db.resource.create({
    data: { title, url: normalizedUrl, type: type || "LINK", lessonId },
  });

  const courseId = lesson.module.courseId;
  revalidatePath(`/courses/${courseId}/manage/content`);
  revalidatePath(`/courses/${courseId}/lessons/${lessonId}`);
  return { success: true };
}

export async function deleteResource(resourceId: string) {
  const session = await auth();
  if (!session?.user) throw new Error("Not authenticated");

  const resource = await db.resource.findUnique({
    where: { id: resourceId },
    include: { lesson: { include: { module: { include: { course: true } } } } },
  });
  if (!resource) throw new Error("Resource not found");

  const userId = (session.user as any).id;
  const role = (session.user as any).role;
  if (!(await canManageCourse(userId, role, resource.lesson.module.course))) {
    throw new Error("Not authorized");
  }

  const courseId = resource.lesson.module.courseId;
  await db.resource.delete({ where: { id: resourceId } });

  revalidatePath(`/courses/${courseId}/manage/content`);
  revalidatePath(`/courses/${courseId}/lessons/${resource.lessonId}`);
  return { success: true };
}

export async function updateResource(
  resourceId: string,
  data: { title: string; url: string; type?: "LINK" | "VIDEO" | "DOCUMENT" }
) {
  const session = await auth();
  if (!session?.user) throw new Error("Not authenticated");

  const resource = await db.resource.findUnique({
    where: { id: resourceId },
    include: { lesson: { include: { module: { include: { course: true } } } } },
  });
  if (!resource) throw new Error("Resource not found");

  const userId = (session.user as any).id;
  const role = (session.user as any).role;
  if (!(await canManageCourse(userId, role, resource.lesson.module.course))) {
    throw new Error("Not authorized");
  }

  const normalizedUrl = normalizeResourceUrl(data.url);
  if (!normalizedUrl) {
    return { error: await serverT("errors.invalidUrl") };
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
