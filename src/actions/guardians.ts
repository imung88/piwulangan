"use server";

import { db } from "@/lib/db";
import { auth } from "@/lib/auth";
import { revalidatePath } from "next/cache";

export async function linkGuardian(guardianId: string, studentId: string): Promise<{ success?: boolean; error?: string }> {
  const session = await auth();
  if (!session?.user) throw new Error("Not authenticated");
  if ((session.user as any).role !== "ADMIN") throw new Error("Not authorized");

  // Verify both users exist and have correct roles
  const guardian = await db.user.findUnique({ where: { id: guardianId } });
  const student = await db.user.findUnique({ where: { id: studentId } });

  if (!guardian || !student) {
    return { error: "User not found" };
  }
  if (guardian.role !== "GUARDIAN") {
    return { error: "Selected user is not a guardian" };
  }
  if (student.role !== "STUDENT") {
    return { error: "Selected user is not a student" };
  }

  // Check if link already exists
  const existing = await db.guardianStudent.findUnique({
    where: { guardianId_studentId: { guardianId, studentId } },
  });

  if (existing) {
    return { error: "This guardian is already linked to this student" };
  }

  await db.guardianStudent.create({
    data: { guardianId, studentId },
  });

  revalidatePath("/admin/users");
  return { success: true };
}

export async function unlinkGuardian(guardianId: string, studentId: string): Promise<{ success?: boolean; error?: string }> {
  const session = await auth();
  if (!session?.user) throw new Error("Not authenticated");
  if ((session.user as any).role !== "ADMIN") throw new Error("Not authorized");

  await db.guardianStudent.delete({
    where: { guardianId_studentId: { guardianId, studentId } },
  });

  revalidatePath("/admin/users");
  return { success: true };
}

export async function getLinkedStudents(guardianId: string) {
  const session = await auth();
  if (!session?.user) throw new Error("Not authenticated");
  if ((session.user as any).role !== "ADMIN") throw new Error("Not authorized");

  const links = await db.guardianStudent.findMany({
    where: { guardianId },
    include: {
      student: {
        select: { id: true, name: true, email: true },
      },
    },
  });

  return links.map((link) => link.student);
}

export async function getLinkedGuardians(studentId: string) {
  const session = await auth();
  if (!session?.user) throw new Error("Not authenticated");
  if ((session.user as any).role !== "ADMIN") throw new Error("Not authorized");

  const links = await db.guardianStudent.findMany({
    where: { studentId },
    include: {
      guardian: {
        select: { id: true, name: true, email: true },
      },
    },
  });

  return links.map((link) => link.guardian);
}
