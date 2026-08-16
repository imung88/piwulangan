/**
 * @module actions/admin
 * @overview Server actions for administrative user management (CRUD, roles, deactivation, password reset).
 * @responsibilities
 *   - Fetch users with filtering/search and pagination support
 *   - Create and update user accounts with uniqueness and contact validation
 *   - Handle user account activation, deactivation, and secure password resetting
 * @exports
 *   - `getUsers`: Retrieves filtered list of system users
 *   - `createUser`: Creates a new user account (Admin only)
 *   - `updateUser`: Updates existing user details
 *   - `deactivateUser`: Deactivates a user account
 *   - `activateUser`: Activates a user account
 *   - `resetPassword`: Resets user password securely
 */
"use server";

import { z } from "zod";
import { db } from "@/lib/db";
import { serverT } from "@/lib/i18n/serverT";
import { hash } from "bcryptjs";
import { revalidatePath } from "next/cache";
import { normalizePhone } from "@/lib/phone";
import { requireRole } from "@/lib/authHelpers";
import { isSuperadminId, isSuperadminEmail, isReservedSuperadminName } from "@/lib/superadmin";
import type { ActionResult } from "@/types/errors";

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

  // The superadmin email is reserved for the env-controlled account.
  if (email && !isSuperadminId(excludeUserId) && isSuperadminEmail(email)) {
    return { error: { email: [await serverT("errors.emailExists")] } };
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

export type AdminUser = {
  id: string;
  name: string;
  email: string | null;
  phone: string | null;
  address: string | null;
  dateOfBirth: Date | null;
  notes: string | null;
  role: string;
  active: boolean;
  createdAt: Date;
  _count: {
    guardianLinks: number;
    studentLinks: number;
  };
};

export async function getUsers(
  search?: string,
  role?: string
): Promise<ActionResult<AdminUser[]>> {
  const user = await requireRole("ADMIN");
  if (!user.success) return user;

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

  return { success: true, data: users };
}

export async function createUser(formData: FormData): Promise<ActionResult> {
  const user = await requireRole("ADMIN");
  if (!user.success) return user;

  const parsed = createUserSchema.safeParse({
    name: formData.get("name"),
    email: formData.get("email"),
    phone: formData.get("phone"),
    password: formData.get("password"),
    role: formData.get("role"),
  });

  if (!parsed.success) {
    return {
      success: false,
      error: await serverT("errors.validationFailed"),
      fieldErrors: parsed.error.flatten().fieldErrors,
    };
  }

  const { name, password, role } = parsed.data;

  if (isReservedSuperadminName(name)) {
    return {
      success: false,
      error: await serverT("errors.validationFailed"),
      fieldErrors: { name: [await serverT("errors.nameReserved")] },
    };
  }

  const contact = await resolveContact(parsed.data.email, parsed.data.phone);
  if ("error" in contact) {
    return {
      success: false,
      error: await serverT("errors.validationFailed"),
      fieldErrors: contact.error,
    };
  }

  const passwordHash = await hash(password, 12);

  await db.user.create({
    data: { name, email: contact.email, phone: contact.phone, passwordHash, role },
  });

  revalidatePath("/admin/users");
  return { success: true };
}

export async function updateUser(userId: string, formData: FormData): Promise<ActionResult> {
  const user = await requireRole("ADMIN");
  if (!user.success) return user;

  if (isSuperadminId(userId)) {
    return { success: false, error: await serverT("errors.superadminReadOnly") };
  }

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
    return {
      success: false,
      error: await serverT("errors.validationFailed"),
      fieldErrors: parsed.error.flatten().fieldErrors,
    };
  }

  if (isReservedSuperadminName(parsed.data.name)) {
    return {
      success: false,
      error: await serverT("errors.validationFailed"),
      fieldErrors: { name: [await serverT("errors.nameReserved")] },
    };
  }

  const contact = await resolveContact(parsed.data.email, parsed.data.phone, userId);
  if ("error" in contact) {
    return {
      success: false,
      error: await serverT("errors.validationFailed"),
      fieldErrors: contact.error,
    };
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

export async function deactivateUser(userId: string): Promise<ActionResult> {
  const user = await requireRole("ADMIN");
  if (!user.success) return user;

  if (isSuperadminId(userId)) {
    return { success: false, error: await serverT("errors.superadminReadOnly") };
  }

  // Prevent deactivating yourself
  if (user.data.id === userId) {
    return { success: false, error: await serverT("errors.cannotDeactivateSelf") };
  }

  await db.user.update({
    where: { id: userId },
    data: { active: false },
  });

  revalidatePath("/admin/users");
  return { success: true };
}

export async function activateUser(userId: string): Promise<ActionResult> {
  const user = await requireRole("ADMIN");
  if (!user.success) return user;

  if (isSuperadminId(userId)) {
    return { success: false, error: await serverT("errors.superadminReadOnly") };
  }

  await db.user.update({
    where: { id: userId },
    data: { active: true },
  });

  revalidatePath("/admin/users");
  return { success: true };
}

export async function resetPassword(
  userId: string,
  newPassword: string
): Promise<ActionResult> {
  const user = await requireRole("ADMIN");
  if (!user.success) return user;

  if (isSuperadminId(userId)) {
    return { success: false, error: await serverT("errors.superadminReadOnly") };
  }

  if (!newPassword || newPassword.length < 6) {
    return { success: false, error: await serverT("errors.passwordMin") };
  }

  const passwordHash = await hash(newPassword, 12);

  await db.user.update({
    where: { id: userId },
    data: { passwordHash },
  });

  return { success: true };
}
