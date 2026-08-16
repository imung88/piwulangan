/**
 * @module actions/progress
 * @overview Server actions for tracking student lesson completion progress.
 * @responsibilities
 *   - Toggle completion status of individual lessons for enrolled students and instructors
 * @exports
 *   - `toggleProgress`: Toggles completion state of a lesson for the current user
 */
"use server";

import { db } from "@/lib/db";
import { serverT } from "@/lib/i18n/serverT";
import { requireUser } from "@/lib/authHelpers";
import { canManageCourse } from "@/lib/coursePerms";
import { revalidatePath } from "next/cache";
import type { ActionResult } from "@/types/errors";

export async function toggleProgress(lessonId: string): Promise<ActionResult> {
  const user = await requireUser();
  if (!user.success) return user;
  const { id: userId, role } = user.data;

  // Check enrollment
  const lesson = await db.lesson.findUnique({
    where: { id: lessonId },
    include: {
      module: {
        include: {
          course: {
            include: {
              enrollments: { where: { userId } },
            },
          },
        },
      },
    },
  });

  if (!lesson) return { success: false, error: await serverT("errors.lessonNotFound") };

  // Only enrolled students, instructors, and admins can mark progress
  const isInstructor = await canManageCourse(userId, role, lesson.module.course);
  const isAdmin = role === "ADMIN";
  const isEnrolled = lesson.module.course.enrollments.length > 0;

  if (!isEnrolled && !isInstructor && !isAdmin) {
    return { success: false, error: await serverT("errors.notEnrolled") };
  }

  // Check current progress
  const existing = await db.progress.findUnique({
    where: { userId_lessonId: { userId, lessonId } },
  });

  if (existing?.completed) {
    // Unmark
    await db.progress.update({
      where: { id: existing.id },
      data: { completed: false, completedAt: null },
    });
  } else if (existing) {
    // Re-mark as complete
    await db.progress.update({
      where: { id: existing.id },
      data: { completed: true, completedAt: new Date() },
    });
  } else {
    // First time
    await db.progress.create({
      data: {
        userId,
        lessonId,
        completed: true,
        completedAt: new Date(),
      },
    });
  }

  const courseId = lesson.module.courseId;
  revalidatePath(`/courses/${courseId}`);
  revalidatePath(`/courses/${courseId}/lessons/${lessonId}`);
  revalidatePath("/dashboard");

  return { success: true };
}
