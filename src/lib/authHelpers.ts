/**
 * @module lib/authHelpers
 * @overview Shared auth/authz guards for server actions.
 * @responsibilities
 *   - Resolve the authenticated user with typed id/role
 *   - Enforce role requirements and course management permissions
 * @exports
 *   - `requireUser`: Returns the session user or an unauthenticated failure
 *   - `requireRole`: Returns the user only when their role is allowed
 *   - `requireCourseManager`: Returns the user + course for admins, owners, co-instructors
 */
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { serverT } from "@/lib/i18n/serverT";
import { canManageCourse, isCourseOwner } from "@/lib/coursePerms";
import type { ActionResult } from "@/types/errors";
import type { Course, Role } from "@prisma/client";

export type SessionUser = {
  id: string;
  role: Role;
};

export async function requireUser(): Promise<ActionResult<SessionUser>> {
  const session = await auth();
  if (!session?.user?.id) {
    return { success: false, error: await serverT("errors.unauthenticated") };
  }
  return { success: true, data: { id: session.user.id, role: session.user.role } };
}

export async function requireRole(...roles: Role[]): Promise<ActionResult<SessionUser>> {
  const user = await requireUser();
  if (!user.success) return user;
  if (!roles.includes(user.data.role)) {
    return { success: false, error: await serverT("errors.unauthorized") };
  }
  return user;
}

/**
 * Authenticated user + course for management actions: admins may manage any
 * course; instructors only their own or co-taught courses.
 */
export async function requireCourseManager(
  courseId: string
): Promise<ActionResult<{ userId: string; role: Role; course: Course }>> {
  const user = await requireUser();
  if (!user.success) return user;
  const { id: userId, role } = user.data;

  if (role !== "ADMIN" && role !== "INSTRUCTOR") {
    return { success: false, error: await serverT("errors.unauthorized") };
  }

  const course = await db.course.findUnique({ where: { id: courseId } });
  if (!course) return { success: false, error: await serverT("errors.courseNotFound") };

  if (!(await canManageCourse(userId, role, course))) {
    return { success: false, error: await serverT("errors.unauthorized") };
  }

  return { success: true, data: { userId, role, course } };
}

/**
 * Authenticated user + course for owner-only actions (admins and the owning
 * instructor — co-instructors are excluded).
 */
export async function requireCourseOwner(
  courseId: string
): Promise<ActionResult<{ userId: string; course: Course }>> {
  const user = await requireUser();
  if (!user.success) return user;
  const { id: userId, role } = user.data;

  const course = await db.course.findUnique({ where: { id: courseId } });
  if (!course) return { success: false, error: await serverT("errors.courseNotFound") };

  if (!isCourseOwner(userId, role, course)) {
    return { success: false, error: await serverT("errors.unauthorized") };
  }

  return { success: true, data: { userId, course } };
}
