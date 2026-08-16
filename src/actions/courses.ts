/**
 * @module actions/courses
 * @overview Server actions for course creation, enrollment management, and co-instructor permissions.
 * @responsibilities
 *   - Manage course lifecycle (create, update, publish, archive, delete)
 *   - Handle student enrollments (invite codes, open enrollment, manual assignment)
 *   - Manage co-instructors and ownership transfer
 * @exports
 *   - `createCourse`: Creates a new course
 *   - `updateCourse`: Updates course details
 *   - `publishCourse` / `unpublishCourse`: Changes course visibility
 *   - `deleteCourse` / `archiveCourse` / `unarchiveCourse`: Deletes or archives courses
 *   - `enrollByCode` / `enrollOpen` / `unenrollSelf`: Student enrollment handling
 *   - `enrollStudent` / `removeEnrollment`: Instructor/admin student management
 *   - `addCoInstructor` / `removeCoInstructor` / `transferOwnership`: Teacher management
 */
"use server";

import { z } from "zod";
import { db } from "@/lib/db";
import { serverT } from "@/lib/i18n/serverT";
import { notify } from "@/lib/notifications";
import { requireUser, requireRole, requireCourseManager, requireCourseOwner } from "@/lib/authHelpers";
import { revalidatePath } from "next/cache";
import type { ActionResult } from "@/types/errors";

const courseSchema = z.object({
  title: z.string().min(2).max(120),
  description: z.string().max(2000).optional(),
  coverImageUrl: z.string().url().optional().or(z.literal("")),
  enrollmentMode: z.enum(["OPEN", "INVITE_CODE", "MANUAL"]),
});

function generateInviteCode(): string {
  const chars = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
  let code = "";
  for (let i = 0; i < 6; i++) {
    code += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return code;
}

export async function createCourse(
  formData: FormData
): Promise<ActionResult<{ courseId: string }>> {
  const user = await requireRole("ADMIN", "INSTRUCTOR");
  if (!user.success) return user;

  const parsed = courseSchema.safeParse({
    title: formData.get("title"),
    description: formData.get("description") || undefined,
    coverImageUrl: formData.get("coverImageUrl") || undefined,
    enrollmentMode: formData.get("enrollmentMode"),
  });

  if (!parsed.success) {
    return {
      success: false,
      error: await serverT("errors.validationFailed"),
      fieldErrors: parsed.error.flatten().fieldErrors,
    };
  }

  const { title, description, coverImageUrl, enrollmentMode } = parsed.data;

  let instructorId = user.data.id;
  const requestedInstructorId = formData.get("instructorId") as string | null;
  if (user.data.role === "ADMIN" && requestedInstructorId) {
    const target = await db.user.findUnique({ where: { id: requestedInstructorId } });
    if (!target || (target.role !== "INSTRUCTOR" && target.role !== "ADMIN")) {
      return {
        success: false,
        error: await serverT("errors.validationFailed"),
        fieldErrors: { instructorId: [await serverT("errors.notAnInstructor")] },
      };
    }
    instructorId = target.id;
  }

  const course = await db.course.create({
    data: {
      title,
      description: description || null,
      coverImageUrl: coverImageUrl || null,
      enrollmentMode,
      inviteCode: enrollmentMode === "INVITE_CODE" ? generateInviteCode() : null,
      instructorId,
    },
  });

  revalidatePath("/courses");
  return { success: true, data: { courseId: course.id } };
}

export async function updateCourse(courseId: string, formData: FormData): Promise<ActionResult> {
  const cm = await requireCourseManager(courseId);
  if (!cm.success) return cm;
  const { course } = cm.data;

  const parsed = courseSchema.safeParse({
    title: formData.get("title"),
    description: formData.get("description") || undefined,
    coverImageUrl: formData.get("coverImageUrl") || undefined,
    enrollmentMode: formData.get("enrollmentMode"),
  });

  if (!parsed.success) {
    return {
      success: false,
      error: await serverT("errors.validationFailed"),
      fieldErrors: parsed.error.flatten().fieldErrors,
    };
  }

  const { title, description, coverImageUrl, enrollmentMode } = parsed.data;

  await db.course.update({
    where: { id: courseId },
    data: {
      title,
      description: description || null,
      coverImageUrl: coverImageUrl || null,
      enrollmentMode,
      inviteCode:
        enrollmentMode === "INVITE_CODE" && !course.inviteCode
          ? generateInviteCode()
          : course.inviteCode,
    },
  });

  revalidatePath(`/courses/${courseId}`);
  revalidatePath(`/courses/${courseId}/manage/settings`);
  return { success: true };
}

export async function publishCourse(courseId: string): Promise<ActionResult> {
  const cm = await requireCourseManager(courseId);
  if (!cm.success) return cm;

  await db.course.update({
    where: { id: courseId },
    data: { visibility: "PUBLISHED" },
  });

  revalidatePath(`/courses/${courseId}`);
  return { success: true };
}

export async function unpublishCourse(courseId: string): Promise<ActionResult> {
  const cm = await requireCourseManager(courseId);
  if (!cm.success) return cm;

  await db.course.update({
    where: { id: courseId },
    data: { visibility: "DRAFT" },
  });

  revalidatePath(`/courses/${courseId}`);
  return { success: true };
}

export async function deleteCourse(courseId: string): Promise<ActionResult> {
  const co = await requireCourseOwner(courseId);
  if (!co.success) return co;

  await db.course.delete({ where: { id: courseId } });

  revalidatePath("/courses");
  return { success: true };
}

export async function enrollByCode(code: string): Promise<ActionResult<{ courseId: string }>> {
  const user = await requireRole("STUDENT");
  if (!user.success) return user;

  const course = await db.course.findUnique({
    where: { inviteCode: code.toUpperCase() },
  });

  if (!course) return { success: false, error: await serverT("errors.invalidInviteCode") };
  if (course.visibility !== "PUBLISHED") {
    return { success: false, error: await serverT("errors.courseNotAvailable") };
  }
  if (course.enrollmentMode !== "INVITE_CODE") {
    return { success: false, error: await serverT("errors.noInviteCodes") };
  }

  const userId = user.data.id;

  // Check if already enrolled
  const existing = await db.enrollment.findUnique({
    where: { userId_courseId: { userId, courseId: course.id } },
  });

  if (existing) return { success: false, error: await serverT("errors.alreadyEnrolled") };

  await db.enrollment.create({
    data: { userId, courseId: course.id },
  });

  revalidatePath("/courses");
  return { success: true, data: { courseId: course.id } };
}

export async function enrollOpen(courseId: string): Promise<ActionResult<{ courseId: string }>> {
  const user = await requireRole("STUDENT");
  if (!user.success) return user;

  const course = await db.course.findUnique({ where: { id: courseId } });
  if (!course) return { success: false, error: await serverT("errors.courseNotFound") };
  if (course.visibility !== "PUBLISHED") {
    return { success: false, error: await serverT("errors.courseNotAvailable") };
  }
  if (course.enrollmentMode !== "OPEN") {
    return { success: false, error: await serverT("errors.noOpenEnrollment") };
  }

  const userId = user.data.id;

  const existing = await db.enrollment.findUnique({
    where: { userId_courseId: { userId, courseId } },
  });

  if (existing) return { success: false, error: await serverT("errors.alreadyEnrolled") };

  await db.enrollment.create({
    data: { userId, courseId },
  });

  revalidatePath("/courses");
  revalidatePath(`/courses/${courseId}`);
  return { success: true, data: { courseId } };
}

export async function unenrollSelf(courseId: string): Promise<ActionResult> {
  const user = await requireUser();
  if (!user.success) return user;
  const userId = user.data.id;

  const enrollment = await db.enrollment.findUnique({
    where: { userId_courseId: { userId, courseId } },
  });
  if (!enrollment) return { success: false, error: await serverT("errors.notEnrolled") };

  await db.enrollment.delete({
    where: { userId_courseId: { userId, courseId } },
  });

  const course = await db.course.findUnique({
    where: { id: courseId },
    select: {
      title: true,
      instructorId: true,
      coInstructors: { select: { userId: true } },
    },
  });
  if (course) {
    const student = await db.user.findUnique({
      where: { id: userId },
      select: { name: true },
    });
    await notify(
      [course.instructorId, ...course.coInstructors.map((c) => c.userId)],
      "UNENROLLMENT",
      `${student?.name ?? "A student"} left ${course.title}`,
      { link: `/courses/${courseId}/manage/students` }
    );
  }

  revalidatePath("/courses");
  revalidatePath(`/courses/${courseId}`);
  return { success: true };
}

export async function enrollStudent(courseId: string, studentId: string): Promise<ActionResult> {
  const cm = await requireCourseManager(courseId);
  if (!cm.success) return cm;
  const { course } = cm.data;

  const existing = await db.enrollment.findUnique({
    where: { userId_courseId: { userId: studentId, courseId } },
  });

  if (existing) return { success: false, error: await serverT("errors.alreadyEnrolled") };

  await db.enrollment.create({
    data: { userId: studentId, courseId },
  });

  await notify([studentId], "ENROLLMENT", `You were enrolled in ${course.title}`, {
    link: `/courses/${courseId}`,
  });

  revalidatePath(`/courses/${courseId}/members`);
  revalidatePath(`/courses/${courseId}/manage/students`);
  return { success: true };
}

export async function removeEnrollment(courseId: string, studentId: string): Promise<ActionResult> {
  const cm = await requireCourseManager(courseId);
  if (!cm.success) return cm;

  await db.enrollment.delete({
    where: { userId_courseId: { userId: studentId, courseId } },
  });

  revalidatePath(`/courses/${courseId}/members`);
  return { success: true };
}

export async function archiveCourse(courseId: string): Promise<ActionResult> {
  const co = await requireCourseOwner(courseId);
  if (!co.success) return co;

  await db.course.update({
    where: { id: courseId },
    data: { visibility: "ARCHIVED" },
  });

  revalidatePath("/courses");
  revalidatePath(`/courses/${courseId}`);
  return { success: true };
}

export async function unarchiveCourse(courseId: string): Promise<ActionResult> {
  const co = await requireCourseOwner(courseId);
  if (!co.success) return co;

  await db.course.update({
    where: { id: courseId },
    data: { visibility: "PUBLISHED" },
  });

  revalidatePath("/courses");
  revalidatePath(`/courses/${courseId}`);
  return { success: true };
}

export async function addCoInstructor(
  courseId: string,
  instructorUserId: string
): Promise<ActionResult> {
  const co = await requireCourseOwner(courseId);
  if (!co.success) return co;
  const { course } = co.data;

  const target = await db.user.findUnique({ where: { id: instructorUserId } });
  if (!target || target.role !== "INSTRUCTOR") {
    return { success: false, error: await serverT("errors.notAnInstructor") };
  }
  if (target.id === course.instructorId) {
    return { success: false, error: await serverT("errors.alreadyOwner") };
  }

  const existing = await db.courseInstructor.findUnique({
    where: { courseId_userId: { courseId, userId: instructorUserId } },
  });
  if (existing) return { success: false, error: await serverT("errors.alreadyCoInstructor") };

  await db.courseInstructor.create({
    data: { courseId, userId: instructorUserId },
  });

  await notify(
    [instructorUserId],
    "ENROLLMENT",
    `You were added as a teacher of ${course.title}`,
    { link: `/courses/${courseId}` }
  );

  revalidatePath(`/courses/${courseId}`);
  revalidatePath(`/courses/${courseId}/members`);
  revalidatePath(`/courses/${courseId}/manage/settings`);
  return { success: true };
}

export async function removeCoInstructor(
  courseId: string,
  instructorUserId: string
): Promise<ActionResult> {
  const co = await requireCourseOwner(courseId);
  if (!co.success) return co;

  await db.courseInstructor.deleteMany({
    where: { courseId, userId: instructorUserId },
  });

  revalidatePath(`/courses/${courseId}`);
  revalidatePath(`/courses/${courseId}/members`);
  revalidatePath(`/courses/${courseId}/manage/settings`);
  return { success: true };
}

export async function transferOwnership(
  courseId: string,
  newInstructorId: string
): Promise<ActionResult> {
  const co = await requireCourseOwner(courseId);
  if (!co.success) return co;
  const { course } = co.data;

  const target = await db.user.findUnique({ where: { id: newInstructorId } });
  if (!target || (target.role !== "INSTRUCTOR" && target.role !== "ADMIN")) {
    return { success: false, error: await serverT("errors.notAnInstructor") };
  }
  if (target.id === course.instructorId) {
    return { success: false, error: await serverT("errors.alreadyOwner") };
  }

  await db.$transaction([
    // The new owner no longer needs a co-instructor row
    db.courseInstructor.deleteMany({ where: { courseId, userId: newInstructorId } }),
    db.course.update({ where: { id: courseId }, data: { instructorId: newInstructorId } }),
  ]);

  await notify([newInstructorId], "ENROLLMENT", `You are now the owner of ${course.title}`, {
    link: `/courses/${courseId}`,
  });

  revalidatePath("/courses");
  revalidatePath(`/courses/${courseId}`);
  revalidatePath(`/courses/${courseId}/members`);
  revalidatePath(`/courses/${courseId}/manage/settings`);
  return { success: true };
}
