/**
 * @module actions/guardians
 * @overview Server actions for linking guardians and students.
 * @responsibilities
 *   - Create and remove associations between guardian and student accounts
 *   - Query linked students for a guardian or linked guardians for a student
 * @exports
 *   - `linkGuardian`: Links a guardian account to a student account
 *   - `unlinkGuardian`: Removes the guardian-student link
 *   - `getLinkedStudents`: Retrieves students linked to a guardian
 *   - `getLinkedGuardians`: Retrieves guardians linked to a student
 */
"use server";

import { db } from "@/lib/db";
import { serverT } from "@/lib/i18n/serverT";
import { revalidatePath } from "next/cache";
import { requireRole } from "@/lib/authHelpers";
import type { ActionResult } from "@/types/errors";

export async function linkGuardian(
  guardianId: string,
  studentId: string
): Promise<ActionResult> {
  const user = await requireRole("ADMIN");
  if (!user.success) return user;

  // Verify both users exist and have correct roles
  const guardian = await db.user.findUnique({ where: { id: guardianId } });
  const student = await db.user.findUnique({ where: { id: studentId } });

  if (!guardian || !student) {
    return { success: false, error: await serverT("errors.userNotFound") };
  }
  if (guardian.role !== "GUARDIAN") {
    return { success: false, error: await serverT("errors.notGuardian") };
  }
  if (student.role !== "STUDENT") {
    return { success: false, error: await serverT("errors.notStudent") };
  }

  // Check if link already exists
  const existing = await db.guardianStudent.findUnique({
    where: { guardianId_studentId: { guardianId, studentId } },
  });

  if (existing) {
    return { success: false, error: await serverT("errors.guardianAlreadyLinked") };
  }

  await db.guardianStudent.create({
    data: { guardianId, studentId },
  });

  revalidatePath("/admin/users");
  return { success: true };
}

export async function unlinkGuardian(
  guardianId: string,
  studentId: string
): Promise<ActionResult> {
  const user = await requireRole("ADMIN");
  if (!user.success) return user;

  await db.guardianStudent.delete({
    where: { guardianId_studentId: { guardianId, studentId } },
  });

  revalidatePath("/admin/users");
  return { success: true };
}

export async function getLinkedStudents(guardianId: string) {
  const user = await requireRole("ADMIN");
  if (!user.success) return user;

  const links = await db.guardianStudent.findMany({
    where: { guardianId },
    include: {
      student: {
        select: { id: true, name: true, email: true, phone: true },
      },
    },
  });

  return { success: true, data: links.map((link) => link.student) };
}

export async function getLinkedGuardians(studentId: string) {
  const user = await requireRole("ADMIN");
  if (!user.success) return user;

  const links = await db.guardianStudent.findMany({
    where: { studentId },
    include: {
      guardian: {
        select: { id: true, name: true, email: true, phone: true },
      },
    },
  });

  return { success: true, data: links.map((link) => link.guardian) };
}
