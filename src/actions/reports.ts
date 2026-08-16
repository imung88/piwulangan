/**
 * @module actions/reports
 * @overview Server actions for student reporting and feedback management.
 * @responsibilities
 *   - Create, update, and delete student progress/behavior reports in courses
 *   - Notify students and guardians upon report creation
 * @exports
 *   - `createReport`: Creates a new student report
 *   - `updateReport`: Updates an existing report
 *   - `deleteReport`: Deletes a student report
 */
"use server";

import { z } from "zod";
import { db } from "@/lib/db";
import { serverT, formatT } from "@/lib/i18n/serverT";
import { revalidatePath } from "next/cache";
import { notify, withGuardians } from "@/lib/notifications";
import { requireCourseManager } from "@/lib/authHelpers";
import type { ActionResult } from "@/types/errors";

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
  const cm = await requireCourseManager(courseId);
  if (!cm.success) return cm;
  const { userId, course } = cm.data;

  const parsed = reportSchema.safeParse({
    studentId: formData.get("studentId"),
    body: formData.get("body"),
    moduleId: formData.get("moduleId") || undefined,
    lessonId: formData.get("lessonId") || undefined,
  });
  if (!parsed.success) {
    return { success: false, error: await serverT("reports.errorInvalid") };
  }
  const { studentId, body, moduleId, lessonId } = parsed.data;

  const enrollment = await db.enrollment.findUnique({
    where: { userId_courseId: { userId: studentId, courseId } },
  });
  if (!enrollment) {
    return { success: false, error: await serverT("reports.errorNotEnrolled") };
  }

  if (lessonId) {
    const lesson = await db.lesson.findUnique({
      where: { id: lessonId },
      include: { module: true },
    });
    if (!lesson || lesson.module.courseId !== courseId) {
      return { success: false, error: await serverT("reports.errorInvalid") };
    }
  } else if (moduleId) {
    const courseModule = await db.module.findUnique({ where: { id: moduleId } });
    if (!courseModule || courseModule.courseId !== courseId) {
      return { success: false, error: await serverT("reports.errorInvalid") };
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
  if (!report) return { success: false, error: await serverT("errors.reportNotFound") };

  const cm = await requireCourseManager(report.courseId);
  if (!cm.success) return cm;
  if (cm.data.role !== "ADMIN" && report.authorId !== cm.data.userId) {
    return { success: false, error: await serverT("errors.unauthorized") };
  }

  const body = formData.get("body");
  const parsed = z.string().min(1).max(5000).safeParse(body);
  if (!parsed.success) {
    return { success: false, error: await serverT("reports.errorInvalid") };
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
  if (!report) return { success: false, error: await serverT("errors.reportNotFound") };

  const cm = await requireCourseManager(report.courseId);
  if (!cm.success) return cm;
  if (cm.data.role !== "ADMIN" && report.authorId !== cm.data.userId) {
    return { success: false, error: await serverT("errors.unauthorized") };
  }

  await db.studentReport.delete({ where: { id: reportId } });

  revalidateReportViews(report.courseId);
  return { success: true };
}
