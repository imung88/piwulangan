/**
 * @module actions/announcements
 * @overview Server actions for managing course announcements and notifications.
 * @responsibilities
 *   - Create, update, delete, and pin/unpin course announcements
 *   - Verify course management permissions for instructors and admins
 *   - Dispatch notifications to enrolled students and their guardians
 * @exports
 *   - `createAnnouncement`: Creates a new course announcement
 *   - `updateAnnouncement`: Updates an existing announcement
 *   - `deleteAnnouncement`: Deletes an announcement
 *   - `togglePin`: Toggles pin status of an announcement
 */
"use server";

import { z } from "zod";
import { db } from "@/lib/db";
import { serverT } from "@/lib/i18n/serverT";
import { notify, withGuardians } from "@/lib/notifications";
import { requireCourseManager } from "@/lib/authHelpers";
import { revalidatePath } from "next/cache";
import type { ActionResult } from "@/types/errors";

const announcementSchema = z.object({
  title: z.string().min(1).max(200),
  body: z.string().min(1),
  pinned: z.boolean().optional(),
});

export async function createAnnouncement(
  courseId: string,
  formData: FormData
): Promise<ActionResult> {
  const cm = await requireCourseManager(courseId);
  if (!cm.success) return cm;
  const { userId, course } = cm.data;

  const parsed = announcementSchema.safeParse({
    title: formData.get("title"),
    body: formData.get("body"),
    pinned: formData.get("pinned") === "on",
  });

  if (!parsed.success) {
    return {
      success: false,
      error: await serverT("errors.validationFailed"),
      fieldErrors: parsed.error.flatten().fieldErrors,
    };
  }

  await db.announcement.create({
    data: {
      courseId,
      authorId: userId,
      title: parsed.data.title,
      body: parsed.data.body,
      pinned: parsed.data.pinned ?? false,
    },
  });

  const enrollments = await db.enrollment.findMany({
    where: { courseId },
    select: { userId: true },
  });
  await notify(
    await withGuardians(enrollments.map((e) => e.userId)),
    "ANNOUNCEMENT",
    `New announcement in ${course.title}: ${parsed.data.title}`,
    { link: `/courses/${courseId}/announcements` }
  );

  revalidatePath(`/courses/${courseId}`);
  revalidatePath(`/courses/${courseId}/announcements`);
  revalidatePath("/announcements");
  revalidatePath("/dashboard");
  return { success: true };
}

export async function updateAnnouncement(
  announcementId: string,
  formData: FormData
): Promise<ActionResult> {
  const announcement = await db.announcement.findUnique({
    where: { id: announcementId },
  });
  if (!announcement) {
    return { success: false, error: await serverT("errors.announcementNotFound") };
  }

  const cm = await requireCourseManager(announcement.courseId);
  if (!cm.success) return cm;

  const parsed = announcementSchema.safeParse({
    title: formData.get("title"),
    body: formData.get("body"),
    pinned: formData.get("pinned") === "on",
  });

  if (!parsed.success) {
    return {
      success: false,
      error: await serverT("errors.validationFailed"),
      fieldErrors: parsed.error.flatten().fieldErrors,
    };
  }

  await db.announcement.update({
    where: { id: announcementId },
    data: {
      title: parsed.data.title,
      body: parsed.data.body,
      pinned: parsed.data.pinned ?? false,
    },
  });

  revalidatePath(`/courses/${announcement.courseId}`);
  revalidatePath(`/courses/${announcement.courseId}/announcements`);
  revalidatePath("/announcements");
  revalidatePath("/dashboard");
  return { success: true };
}

export async function deleteAnnouncement(announcementId: string): Promise<ActionResult> {
  const announcement = await db.announcement.findUnique({
    where: { id: announcementId },
  });
  if (!announcement) {
    return { success: false, error: await serverT("errors.announcementNotFound") };
  }

  const cm = await requireCourseManager(announcement.courseId);
  if (!cm.success) return cm;

  await db.announcement.delete({ where: { id: announcementId } });

  revalidatePath(`/courses/${announcement.courseId}`);
  revalidatePath(`/courses/${announcement.courseId}/announcements`);
  revalidatePath("/announcements");
  revalidatePath("/dashboard");
  return { success: true };
}

export async function togglePin(announcementId: string): Promise<ActionResult> {
  const announcement = await db.announcement.findUnique({
    where: { id: announcementId },
  });
  if (!announcement) {
    return { success: false, error: await serverT("errors.announcementNotFound") };
  }

  const cm = await requireCourseManager(announcement.courseId);
  if (!cm.success) return cm;

  await db.announcement.update({
    where: { id: announcementId },
    data: { pinned: !announcement.pinned },
  });

  revalidatePath(`/courses/${announcement.courseId}`);
  revalidatePath(`/courses/${announcement.courseId}/announcements`);
  revalidatePath("/announcements");
  revalidatePath("/dashboard");
  return { success: true };
}
