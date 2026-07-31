"use server";

import { z } from "zod";
import { db } from "@/lib/db";
import { auth } from "@/lib/auth";
import { serverT, formatT } from "@/lib/i18n/serverT";
import { revalidatePath } from "next/cache";
import { notify, withGuardians } from "@/lib/notifications";
import { canManageCourse } from "@/lib/coursePerms";

type ActionResult = { success?: boolean; error?: any };

async function requireUser() {
  const session = await auth();
  if (!session?.user) throw new Error("Not authenticated");
  return {
    userId: (session.user as any).id as string,
    role: (session.user as any).role as string,
  };
}

async function requireCourseManager(courseId: string) {
  const { userId, role } = await requireUser();
  if (role !== "ADMIN" && role !== "INSTRUCTOR") {
    throw new Error("Not authorized");
  }
  const course = await db.course.findUnique({ where: { id: courseId } });
  if (!course) throw new Error("Course not found");
  if (!(await canManageCourse(userId, role, course))) {
    throw new Error("Not authorized");
  }
  return { userId, role, course };
}

const reportSchema = z.object({
  studentId: z.string().min(1),
  body: z.string().min(1).max(5000),
  moduleId: z.string().optional(),
  lessonId: z.string().optional(),
});

function revalidateReportViews(courseId: string) {
  revalidatePath(`/courses/${courseId}/reports`);
  revalidatePath(`/courses/${courseId}/manage/reports`);
}

export async function createReport(
  courseId: string,
  formData: FormData
): Promise<ActionResult> {
  const { userId, course } = await requireCourseManager(courseId);

  const parsed = reportSchema.safeParse({
    studentId: formData.get("studentId"),
    body: formData.get("body"),
    moduleId: formData.get("moduleId") || undefined,
    lessonId: formData.get("lessonId") || undefined,
  });
  if (!parsed.success) {
    return { error: await serverT("reports.errorInvalid") };
  }
  const { studentId, body, moduleId, lessonId } = parsed.data;

  const enrollment = await db.enrollment.findUnique({
    where: { userId_courseId: { userId: studentId, courseId } },
  });
  if (!enrollment) {
    return { error: await serverT("reports.errorNotEnrolled") };
  }

  if (lessonId) {
    const lesson = await db.lesson.findUnique({
      where: { id: lessonId },
      include: { module: true },
    });
    if (!lesson || lesson.module.courseId !== courseId) {
      return { error: await serverT("reports.errorInvalid") };
    }
  } else if (moduleId) {
    const courseModule = await db.module.findUnique({ where: { id: moduleId } });
    if (!courseModule || courseModule.courseId !== courseId) {
      return { error: await serverT("reports.errorInvalid") };
    }
  }

  await db.studentReport.create({
    data: {
      courseId,
      studentId,
      authorId: userId,
      body,
      moduleId: moduleId || null,
      lessonId: lessonId || null,
    },
  });

  await notify(
    await withGuardians([studentId]),
    "REPORT",
    formatT(await serverT("reports.notifyNew"), { course: course.title }),
    { link: `/courses/${courseId}/reports` }
  );

  revalidateReportViews(courseId);
  return { success: true };
}

export async function updateReport(
  reportId: string,
  formData: FormData
): Promise<ActionResult> {
  const report = await db.studentReport.findUnique({
    where: { id: reportId },
  });
  if (!report) throw new Error("Report not found");
  const { userId, role } = await requireCourseManager(report.courseId);
  if (role !== "ADMIN" && report.authorId !== userId) {
    throw new Error("Not authorized");
  }

  const body = formData.get("body");
  const parsed = z.string().min(1).max(5000).safeParse(body);
  if (!parsed.success) {
    return { error: await serverT("reports.errorInvalid") };
  }

  await db.studentReport.update({
    where: { id: reportId },
    data: { body: parsed.data },
  });

  revalidateReportViews(report.courseId);
  return { success: true };
}

export async function deleteReport(reportId: string): Promise<ActionResult> {
  const report = await db.studentReport.findUnique({
    where: { id: reportId },
  });
  if (!report) throw new Error("Report not found");
  const { userId, role } = await requireCourseManager(report.courseId);
  if (role !== "ADMIN" && report.authorId !== userId) {
    throw new Error("Not authorized");
  }

  await db.studentReport.delete({ where: { id: reportId } });

  revalidateReportViews(report.courseId);
  return { success: true };
}
