"use server";

import { z } from "zod";
import { db } from "@/lib/db";
import { auth } from "@/lib/auth";
import { serverT } from "@/lib/i18n/serverT";
import { hash } from "bcryptjs";
import { revalidatePath } from "next/cache";
import { normalizePhone } from "@/lib/phone";

const createUserSchema = z.object({
  name: z.string().min(2).max(100),
  email: z.string().email().optional().or(z.literal("")),
  phone: z.string().optional().or(z.literal("")),
  password: z.string().min(6),
  role: z.enum(["ADMIN", "INSTRUCTOR", "STUDENT", "GUARDIAN"]),
});

const updateUserSchema = z.object({
  name: z.string().min(2).max(100),
  email: z.string().email().optional().or(z.literal("")),
  phone: z.string().optional().or(z.literal("")),
  address: z.string().max(500).optional().or(z.literal("")),
  dateOfBirth: z.string().optional().or(z.literal("")),
  notes: z.string().max(1000).optional().or(z.literal("")),
  role: z.enum(["ADMIN", "INSTRUCTOR", "STUDENT", "GUARDIAN"]),
});

type ContactCheck =
  | { error: Record<string, string[]> }
  | { email: string | null; phone: string | null };

async function resolveContact(
  rawEmail: string | undefined,
  rawPhone: string | undefined,
  excludeUserId?: string
): Promise<ContactCheck> {
  const email = rawEmail ? rawEmail.toLowerCase() : null;
  let phone: string | null = null;

  if (rawPhone) {
    phone = normalizePhone(rawPhone);
    if (!phone) {
      return { error: { phone: [await serverT("errors.invalidIdentifier")] } };
    }
  }

  if (!email && !phone) {
    return { error: { form: [await serverT("errors.identifierRequired")] } };
  }

  if (email) {
    const existing = await db.user.findFirst({
      where: { email, ...(excludeUserId ? { id: { not: excludeUserId } } : {}) },
    });
    if (existing) {
      return { error: { email: [await serverT("errors.emailExists")] } };
    }
  }

  if (phone) {
    const existing = await db.user.findFirst({
      where: { phone, ...(excludeUserId ? { id: { not: excludeUserId } } : {}) },
    });
    if (existing) {
      return { error: { phone: [await serverT("errors.phoneExists")] } };
    }
  }

  return { email, phone };
}

export async function getUsers(search?: string, role?: string) {
  const session = await auth();
  if (!session?.user) throw new Error("Not authenticated");
  if ((session.user as any).role !== "ADMIN") throw new Error("Not authorized");

  const where: any = {};
  if (search) {
    where.OR = [
      { name: { contains: search } },
      { email: { contains: search } },
      { phone: { contains: search } },
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
      phone: true,
      address: true,
      dateOfBirth: true,
      notes: true,
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
    phone: formData.get("phone"),
    password: formData.get("password"),
    role: formData.get("role"),
  });

  if (!parsed.success) {
    return { error: parsed.error.flatten().fieldErrors };
  }

  const { name, password, role } = parsed.data;

  const contact = await resolveContact(parsed.data.email, parsed.data.phone);
  if ("error" in contact) {
    return { error: contact.error };
  }

  const passwordHash = await hash(password, 12);

  await db.user.create({
    data: { name, email: contact.email, phone: contact.phone, passwordHash, role },
  });

  revalidatePath("/admin/users");
  return { success: true };
}

export async function updateUser(userId: string, formData: FormData): Promise<{ success?: boolean; error?: any }> {
  const session = await auth();
  if (!session?.user) throw new Error("Not authenticated");
  if ((session.user as any).role !== "ADMIN") throw new Error("Not authorized");

  const parsed = updateUserSchema.safeParse({
    name: formData.get("name"),
    email: formData.get("email"),
    phone: formData.get("phone"),
    address: formData.get("address"),
    dateOfBirth: formData.get("dateOfBirth"),
    notes: formData.get("notes"),
    role: formData.get("role"),
  });

  if (!parsed.success) {
    return { error: parsed.error.flatten().fieldErrors };
  }

  const contact = await resolveContact(parsed.data.email, parsed.data.phone, userId);
  if ("error" in contact) {
    return { error: contact.error };
  }

  await db.user.update({
    where: { id: userId },
    data: {
      name: parsed.data.name,
      email: contact.email,
      phone: contact.phone,
      address: parsed.data.address || null,
      dateOfBirth: parsed.data.dateOfBirth ? new Date(parsed.data.dateOfBirth) : null,
      notes: parsed.data.notes || null,
      role: parsed.data.role,
    },
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
    return { error: await serverT("errors.cannotDeactivateSelf") };
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
    return { error: await serverT("errors.passwordMin") };
  }

  const passwordHash = await hash(newPassword, 12);

  await db.user.update({
    where: { id: userId },
    data: { passwordHash },
  });

  return { success: true };
}
