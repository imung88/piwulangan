/**
 * @module lib/notifications
 * @overview Notification creation and guardian recipient resolution helpers.
 * @responsibilities
 *   - Resolve student IDs to include linked guardians
 *   - Batch create notifications in database for users
 * @exports
 *   - `withGuardians`: Appends linked guardian IDs to student ID lists
 *   - `notify`: Creates notification records for specified users
 */
import { db } from "./db";

export async function withGuardians(studentIds: string[]) {
  if (studentIds.length === 0) return studentIds;
  const links = await db.guardianStudent.findMany({
    where: { studentId: { in: studentIds } },
    select: { guardianId: true },
  });
  return [...studentIds, ...links.map((l) => l.guardianId)];
}

export async function notify(
  userIds: string[],
  type: string,
  title: string,
  opts?: { body?: string; link?: string }
) {
  const unique = Array.from(new Set(userIds));
  if (unique.length === 0) return;
  await db.notification.createMany({
    data: unique.map((userId) => ({
      userId,
      type,
      title,
      body: opts?.body,
      link: opts?.link,
    })),
  });
}
