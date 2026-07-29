"use server";

import { db } from "@/lib/db";
import { auth } from "@/lib/auth";
import { canManageCourse } from "@/lib/coursePerms";
import { revalidatePath } from "next/cache";

export async function toggleProgress(lessonId: string) {
  const session = await auth();
  if (!session?.user) throw new Error("Not authenticated");

  const userId = (session.user as any).id;

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

  if (!lesson) throw new Error("Lesson not found");

  // Only enrolled students, instructors, and admins can mark progress
  const role = (session.user as any).role;
  const isInstructor = await canManageCourse(userId, role, lesson.module.course);
  const isAdmin = role === "ADMIN";
  const isEnrolled = lesson.module.course.enrollments.length > 0;

  if (!isEnrolled && !isInstructor && !isAdmin) {
    throw new Error("Not enrolled in this course");
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
