"use server";

import { z } from "zod";
import { db } from "@/lib/db";
import { auth } from "@/lib/auth";
import { hash } from "bcryptjs";
import { revalidatePath } from "next/cache";

const createUserSchema = z.object({
  name: z.string().min(2).max(100),
  email: z.string().email(),
  password: z.string().min(6),
  role: z.enum(["ADMIN", "INSTRUCTOR", "STUDENT", "GUARDIAN"]),
});

const updateUserSchema = z.object({
  name: z.string().min(2).max(100).optional(),
  email: z.string().email().optional(),
  role: z.enum(["ADMIN", "INSTRUCTOR", "STUDENT", "GUARDIAN"]).optional(),
});

export async function getUsers(search?: string, role?: string) {
  const session = await auth();
  if (!session?.user) throw new Error("Not authenticated");
  if ((session.user as any).role !== "ADMIN") throw new Error("Not authorized");

  const where: any = {};
  if (search) {
    where.OR = [
      { name: { contains: search, mode: "insensitive" } },
      { email: { contains: search, mode: "insensitive" } },
    ];
  }
  if (role && role !== "ALL") {
    where.role = role;
  }

  const users = await db.user.findMany({
    where,
    select: {
      id: true,
      name: true,
      email: true,
      role: true,
      active: true,
      createdAt: true,
      _count: {
        select: {
          guardianLinks: true,
          studentLinks: true,
        },
      },
    },
    orderBy: { createdAt: "desc" },
  });

  return users;
}

export async function createUser(formData: FormData): Promise<{ success?: boolean; error?: any }> {
  const session = await auth();
  if (!session?.user) throw new Error("Not authenticated");
  if ((session.user as any).role !== "ADMIN") throw new Error("Not authorized");

  const parsed = createUserSchema.safeParse({
    name: formData.get("name"),
    email: formData.get("email"),
    password: formData.get("password"),
    role: formData.get("role"),
  });

  if (!parsed.success) {
    return { error: parsed.error.flatten().fieldErrors };
  }

  const { name, email, password, role } = parsed.data;

  const existing = await db.user.findUnique({ where: { email } });
  if (existing) {
    return { error: { email: ["A user with this email already exists"] } };
  }

  const passwordHash = await hash(password, 12);

  await db.user.create({
    data: { name, email, passwordHash, role },
  });

  revalidatePath("/admin/users");
  return { success: true };
}

export async function updateUser(userId: string, formData: FormData): Promise<{ success?: boolean; error?: any }> {
  const session = await auth();
  if (!session?.user) throw new Error("Not authenticated");
  if ((session.user as any).role !== "ADMIN") throw new Error("Not authorized");

  const parsed = updateUserSchema.safeParse({
    name: formData.get("name") || undefined,
    email: formData.get("email") || undefined,
    role: formData.get("role") || undefined,
  });

  if (!parsed.success) {
    return { error: parsed.error.flatten().fieldErrors };
  }

  const data = parsed.data;

  // Check if email is being changed and already exists
  if (data.email) {
    const existing = await db.user.findFirst({
      where: { email: data.email, id: { not: userId } },
    });
    if (existing) {
      return { error: { email: ["A user with this email already exists"] } };
    }
  }

  await db.user.update({
    where: { id: userId },
    data,
  });

  revalidatePath("/admin/users");
  return { success: true };
}

export async function deactivateUser(userId: string): Promise<{ success?: boolean; error?: string }> {
  const session = await auth();
  if (!session?.user) throw new Error("Not authenticated");
  if ((session.user as any).role !== "ADMIN") throw new Error("Not authorized");

  // Prevent deactivating yourself
  if ((session.user as any).id === userId) {
    return { error: "Cannot deactivate your own account" };
  }

  await db.user.update({
    where: { id: userId },
    data: { active: false },
  });

  revalidatePath("/admin/users");
  return { success: true };
}

export async function activateUser(userId: string): Promise<{ success?: boolean; error?: string }> {
  const session = await auth();
  if (!session?.user) throw new Error("Not authenticated");
  if ((session.user as any).role !== "ADMIN") throw new Error("Not authorized");

  await db.user.update({
    where: { id: userId },
    data: { active: true },
  });

  revalidatePath("/admin/users");
  return { success: true };
}

export async function resetPassword(userId: string, newPassword: string): Promise<{ success?: boolean; error?: string }> {
  const session = await auth();
  if (!session?.user) throw new Error("Not authenticated");
  if ((session.user as any).role !== "ADMIN") throw new Error("Not authorized");

  if (!newPassword || newPassword.length < 6) {
    return { error: "Password must be at least 6 characters" };
  }

  const passwordHash = await hash(newPassword, 12);

  await db.user.update({
    where: { id: userId },
    data: { passwordHash },
  });

  return { success: true };
}
