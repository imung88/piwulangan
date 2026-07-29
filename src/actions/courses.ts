"use server";

import { z } from "zod";
import { db } from "@/lib/db";
import { auth } from "@/lib/auth";
import { serverT } from "@/lib/i18n/serverT";
import { notify } from "@/lib/notifications";
import { revalidatePath } from "next/cache";

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

export async function createCourse(formData: FormData) {
  const session = await auth();
  if (!session?.user) throw new Error("Not authenticated");
  const role = (session.user as any).role;
  if (role !== "ADMIN" && role !== "INSTRUCTOR") throw new Error("Not authorized");

  const parsed = courseSchema.safeParse({
    title: formData.get("title"),
    description: formData.get("description") || undefined,
    coverImageUrl: formData.get("coverImageUrl") || undefined,
    enrollmentMode: formData.get("enrollmentMode"),
  });

  if (!parsed.success) {
    return { error: parsed.error.flatten().fieldErrors };
  }

  const { title, description, coverImageUrl, enrollmentMode } = parsed.data;

  const course = await db.course.create({
    data: {
      title,
      description: description || null,
      coverImageUrl: coverImageUrl || null,
      enrollmentMode,
      inviteCode: enrollmentMode === "INVITE_CODE" ? generateInviteCode() : null,
      instructorId: (session.user as any).id,
    },
  });

  revalidatePath("/courses");
  return { success: true, courseId: course.id };
}

export async function updateCourse(courseId: string, formData: FormData) {
  const session = await auth();
  if (!session?.user) throw new Error("Not authenticated");

  const course = await db.course.findUnique({ where: { id: courseId } });
  if (!course) throw new Error("Course not found");

  const userId = (session.user as any).id;
  const role = (session.user as any).role;
  if (role !== "ADMIN" && course.instructorId !== userId) {
    throw new Error("Not authorized");
  }

  const parsed = courseSchema.safeParse({
    title: formData.get("title"),
    description: formData.get("description") || undefined,
    coverImageUrl: formData.get("coverImageUrl") || undefined,
    enrollmentMode: formData.get("enrollmentMode"),
  });

  if (!parsed.success) {
    return { error: parsed.error.flatten().fieldErrors };
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

export async function publishCourse(courseId: string) {
  const session = await auth();
  if (!session?.user) throw new Error("Not authenticated");

  const course = await db.course.findUnique({ where: { id: courseId } });
  if (!course) throw new Error("Course not found");

  const userId = (session.user as any).id;
  const role = (session.user as any).role;
  if (role !== "ADMIN" && course.instructorId !== userId) {
    throw new Error("Not authorized");
  }

  await db.course.update({
    where: { id: courseId },
    data: { visibility: "PUBLISHED" },
  });

  revalidatePath(`/courses/${courseId}`);
  return { success: true };
}

export async function unpublishCourse(courseId: string) {
  const session = await auth();
  if (!session?.user) throw new Error("Not authenticated");

  const course = await db.course.findUnique({ where: { id: courseId } });
  if (!course) throw new Error("Course not found");

  const userId = (session.user as any).id;
  const role = (session.user as any).role;
  if (role !== "ADMIN" && course.instructorId !== userId) {
    throw new Error("Not authorized");
  }

  await db.course.update({
    where: { id: courseId },
    data: { visibility: "DRAFT" },
  });

  revalidatePath(`/courses/${courseId}`);
  return { success: true };
}

export async function deleteCourse(courseId: string) {
  const session = await auth();
  if (!session?.user) throw new Error("Not authenticated");

  const course = await db.course.findUnique({ where: { id: courseId } });
  if (!course) throw new Error("Course not found");

  const userId = (session.user as any).id;
  const role = (session.user as any).role;
  if (role !== "ADMIN" && course.instructorId !== userId) {
    throw new Error("Not authorized");
  }

  await db.course.delete({ where: { id: courseId } });

  revalidatePath("/courses");
  return { success: true };
}

export async function enrollByCode(code: string) {
  const session = await auth();
  if (!session?.user) throw new Error("Not authenticated");
  if ((session.user as any).role !== "STUDENT") {
    return { error: await serverT("errors.onlyStudentsEnroll") };
  }

  const course = await db.course.findUnique({
    where: { inviteCode: code.toUpperCase() },
  });

  if (!course) return { error: await serverT("errors.invalidInviteCode") };
  if (course.visibility !== "PUBLISHED") return { error: await serverT("errors.courseNotAvailable") };
  if (course.enrollmentMode !== "INVITE_CODE") {
    return { error: await serverT("errors.noInviteCodes") };
  }

  const userId = (session.user as any).id;

  // Check if already enrolled
  const existing = await db.enrollment.findUnique({
    where: { userId_courseId: { userId, courseId: course.id } },
  });

  if (existing) return { error: await serverT("errors.alreadyEnrolled") };

  await db.enrollment.create({
    data: { userId, courseId: course.id },
  });

  revalidatePath("/courses");
  return { success: true, courseId: course.id };
}

export async function enrollOpen(courseId: string) {
  const session = await auth();
  if (!session?.user) throw new Error("Not authenticated");
  if ((session.user as any).role !== "STUDENT") {
    return { error: await serverT("errors.onlyStudentsEnroll") };
  }

  const course = await db.course.findUnique({ where: { id: courseId } });
  if (!course) return { error: await serverT("errors.courseNotFound") };
  if (course.visibility !== "PUBLISHED") return { error: await serverT("errors.courseNotAvailable") };
  if (course.enrollmentMode !== "OPEN") {
    return { error: await serverT("errors.noOpenEnrollment") };
  }

  const userId = (session.user as any).id;

  const existing = await db.enrollment.findUnique({
    where: { userId_courseId: { userId, courseId } },
  });

  if (existing) return { error: await serverT("errors.alreadyEnrolled") };

  await db.enrollment.create({
    data: { userId, courseId },
  });

  revalidatePath("/courses");
  revalidatePath(`/courses/${courseId}`);
  return { success: true, courseId };
}

export async function unenrollSelf(courseId: string) {
  const session = await auth();
  if (!session?.user) throw new Error("Not authenticated");

  const userId = (session.user as any).id;

  const enrollment = await db.enrollment.findUnique({
    where: { userId_courseId: { userId, courseId } },
  });
  if (!enrollment) return { error: await serverT("errors.notEnrolled") };

  await db.enrollment.delete({
    where: { userId_courseId: { userId, courseId } },
  });

  revalidatePath("/courses");
  revalidatePath(`/courses/${courseId}`);
  return { success: true };
}

export async function enrollStudent(courseId: string, studentId: string) {
  const session = await auth();
  if (!session?.user) throw new Error("Not authenticated");

  const course = await db.course.findUnique({ where: { id: courseId } });
  if (!course) throw new Error("Course not found");

  const userId = (session.user as any).id;
  const role = (session.user as any).role;
  if (role !== "ADMIN" && course.instructorId !== userId) {
    throw new Error("Not authorized");
  }

  const existing = await db.enrollment.findUnique({
    where: { userId_courseId: { userId: studentId, courseId } },
  });

  if (existing) return { error: await serverT("errors.alreadyEnrolled") };

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

export async function removeEnrollment(courseId: string, studentId: string) {
  const session = await auth();
  if (!session?.user) throw new Error("Not authenticated");

  const course = await db.course.findUnique({ where: { id: courseId } });
  if (!course) throw new Error("Course not found");

  const userId = (session.user as any).id;
  const role = (session.user as any).role;
  if (role !== "ADMIN" && course.instructorId !== userId) {
    throw new Error("Not authorized");
  }

  await db.enrollment.delete({
    where: { userId_courseId: { userId: studentId, courseId } },
  });

  revalidatePath(`/courses/${courseId}/members`);
  return { success: true };
}

export async function archiveCourse(courseId: string): Promise<{ success?: boolean; error?: string }> {
  const session = await auth();
  if (!session?.user) throw new Error("Not authenticated");

  const course = await db.course.findUnique({ where: { id: courseId } });
  if (!course) throw new Error("Course not found");

  const userId = (session.user as any).id;
  const role = (session.user as any).role;
  if (role !== "ADMIN" && course.instructorId !== userId) {
    throw new Error("Not authorized");
  }

  await db.course.update({
    where: { id: courseId },
    data: { visibility: "ARCHIVED" },
  });

  revalidatePath("/courses");
  revalidatePath(`/courses/${courseId}`);
  return { success: true };
}

export async function unarchiveCourse(courseId: string): Promise<{ success?: boolean; error?: string }> {
  const session = await auth();
  if (!session?.user) throw new Error("Not authenticated");

  const course = await db.course.findUnique({ where: { id: courseId } });
  if (!course) throw new Error("Course not found");

  const userId = (session.user as any).id;
  const role = (session.user as any).role;
  if (role !== "ADMIN" && course.instructorId !== userId) {
    throw new Error("Not authorized");
  }

  await db.course.update({
    where: { id: courseId },
    data: { visibility: "PUBLISHED" },
  });

  revalidatePath("/courses");
  revalidatePath(`/courses/${courseId}`);
  return { success: true };
}
