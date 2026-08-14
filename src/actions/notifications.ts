/**
 * @module actions/notifications
 * @overview Server actions for user notifications management.
 * @responsibilities
 *   - Fetch user notifications and unread counts
 *   - Mark individual or all notifications as read
 * @exports
 *   - `markRead`: Marks a single notification as read
 *   - `markAllRead`: Marks all user notifications as read
 *   - `getMyNotifications`: Retrieves current user notifications and unread count
 */
"use server";

import { db } from "@/lib/db";
import { auth } from "@/lib/auth";
import { revalidatePath } from "next/cache";

async function requireUserId(): Promise<string> {
  const session = await auth();
  if (!session?.user) throw new Error("Not authenticated");
  return (session.user as any).id;
}

export async function markRead(notificationId: string) {
  const userId = await requireUserId();

  await db.notification.updateMany({
    where: { id: notificationId, userId, readAt: null },
    data: { readAt: new Date() },
  });

  revalidatePath("/notifications");
  return { success: true };
}

export async function markAllRead() {
  const userId = await requireUserId();

  await db.notification.updateMany({
    where: { userId, readAt: null },
    data: { readAt: new Date() },
  });

  revalidatePath("/notifications");
  return { success: true };
}

export async function getMyNotifications() {
  const userId = await requireUserId();

  const [notifications, unreadCount] = await Promise.all([
    db.notification.findMany({
      where: { userId },
      orderBy: { createdAt: "desc" },
      take: 10,
    }),
    db.notification.count({ where: { userId, readAt: null } }),
  ]);

  return {
    unreadCount,
    notifications: notifications.map((n) => ({
      id: n.id,
      type: n.type,
      title: n.title,
      body: n.body,
      link: n.link,
      read: n.readAt !== null,
      createdAt: n.createdAt.toISOString(),
    })),
  };
}
