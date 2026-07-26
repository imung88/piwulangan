"use server";

import { z } from "zod";
import { db } from "@/lib/db";
import { auth } from "@/lib/auth";
import { revalidatePath } from "next/cache";

const announcementSchema = z.object({
  title: z.string().min(1).max(200),
  body: z.string().min(1),
  pinned: z.boolean().optional(),
});

export async function createAnnouncement(courseId: string, formData: FormData) {
  const session = await auth();
  if (!session?.user) throw new Error("Not authenticated");

  const course = await db.course.findUnique({ where: { id: courseId } });
  if (!course) throw new Error("Course not found");

  const userId = (session.user as any).id;
  const role = (session.user as any).role;
  if (role !== "ADMIN" && course.instructorId !== userId) {
    throw new Error("Not authorized");
  }

  const parsed = announcementSchema.safeParse({
    title: formData.get("title"),
    body: formData.get("body"),
    pinned: formData.get("pinned") === "on",
  });

  if (!parsed.success) {
    return { error: parsed.error.flatten().fieldErrors };
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

  revalidatePath(`/courses/${courseId}`);
  revalidatePath(`/courses/${courseId}/manage/announcements`);
  revalidatePath(`/courses/${courseId}/announcements`);
  revalidatePath("/dashboard");
  return { success: true };
}

export async function updateAnnouncement(
  announcementId: string,
  formData: FormData
) {
  const session = await auth();
  if (!session?.user) throw new Error("Not authenticated");

  const announcement = await db.announcement.findUnique({
    where: { id: announcementId },
    include: { course: true },
  });
  if (!announcement) throw new Error("Announcement not found");

  const userId = (session.user as any).id;
  const role = (session.user as any).role;
  if (role !== "ADMIN" && announcement.course.instructorId !== userId) {
    throw new Error("Not authorized");
  }

  const parsed = announcementSchema.safeParse({
    title: formData.get("title"),
    body: formData.get("body"),
    pinned: formData.get("pinned") === "on",
  });

  if (!parsed.success) {
    return { error: parsed.error.flatten().fieldErrors };
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
  revalidatePath(`/courses/${announcement.courseId}/manage/announcements`);
  revalidatePath(`/courses/${announcement.courseId}/announcements`);
  revalidatePath("/dashboard");
  return { success: true };
}

export async function deleteAnnouncement(announcementId: string) {
  const session = await auth();
  if (!session?.user) throw new Error("Not authenticated");

  const announcement = await db.announcement.findUnique({
    where: { id: announcementId },
    include: { course: true },
  });
  if (!announcement) throw new Error("Announcement not found");

  const userId = (session.user as any).id;
  const role = (session.user as any).role;
  if (role !== "ADMIN" && announcement.course.instructorId !== userId) {
    throw new Error("Not authorized");
  }

  await db.announcement.delete({ where: { id: announcementId } });

  revalidatePath(`/courses/${announcement.courseId}`);
  revalidatePath(`/courses/${announcement.courseId}/manage/announcements`);
  revalidatePath(`/courses/${announcement.courseId}/announcements`);
  revalidatePath("/dashboard");
  return { success: true };
}

export async function togglePin(announcementId: string) {
  const session = await auth();
  if (!session?.user) throw new Error("Not authenticated");

  const announcement = await db.announcement.findUnique({
    where: { id: announcementId },
    include: { course: true },
  });
  if (!announcement) throw new Error("Announcement not found");

  const userId = (session.user as any).id;
  const role = (session.user as any).role;
  if (role !== "ADMIN" && announcement.course.instructorId !== userId) {
    throw new Error("Not authorized");
  }

  await db.announcement.update({
    where: { id: announcementId },
    data: { pinned: !announcement.pinned },
  });

  revalidatePath(`/courses/${announcement.courseId}`);
  revalidatePath(`/courses/${announcement.courseId}/manage/announcements`);
  revalidatePath(`/courses/${announcement.courseId}/announcements`);
  revalidatePath("/dashboard");
  return { success: true };
}
