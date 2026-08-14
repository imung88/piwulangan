/**
 * @module actions/profile
 * @overview Server actions for managing user profile settings, app title, and password changes.
 * @responsibilities
 *   - Update user profile details (name, email, phone, address, date of birth)
 *   - Update global application title (Superadmin only)
 *   - Handle secure password changes for regular users
 * @exports
 *   - `updateProfile`: Updates current user's profile
 *   - `updateAppTitle`: Updates global application title
 *   - `changePassword`: Changes current user's password
 */
"use server";

import { z } from "zod";
import { compare, hash } from "bcryptjs";
import { db } from "@/lib/db";
import { auth } from "@/lib/auth";
import { serverT } from "@/lib/i18n/serverT";
import { normalizePhone } from "@/lib/phone";
import { revalidatePath } from "next/cache";
import { isSuperadminId, isReservedSuperadminName } from "@/lib/superadmin";
import { APP_TITLE_KEY, APP_TITLE_MAX_LENGTH } from "@/lib/appSettings";

const profileSchema = z.object({
  name: z.string().min(2).max(100),
  email: z.string().email().optional().or(z.literal("")),
  phone: z.string().optional().or(z.literal("")),
  address: z.string().max(500).optional().or(z.literal("")),
  dateOfBirth: z.string().optional().or(z.literal("")),
  notes: z.string().max(1000).optional().or(z.literal("")),
});

export async function updateProfile(formData: FormData): Promise<{ success?: boolean; error?: Record<string, string[]> }> {
  const session = await auth();
  if (!session?.user) throw new Error("Not authenticated");
  const userId = (session.user as { id: string }).id;

  if (isSuperadminId(userId)) {
    return { error: { form: [await serverT("errors.superadminReadOnly")] } };
  }

  const parsed = profileSchema.safeParse({
    name: formData.get("name"),
    email: formData.get("email"),
    phone: formData.get("phone"),
    address: formData.get("address"),
    dateOfBirth: formData.get("dateOfBirth"),
    notes: formData.get("notes"),
  });

  if (!parsed.success) {
    return { error: parsed.error.flatten().fieldErrors };
  }

  if (isReservedSuperadminName(parsed.data.name)) {
    return { error: { name: [await serverT("errors.nameReserved")] } };
  }

  const email = parsed.data.email ? parsed.data.email.toLowerCase() : null;
  let phone: string | null = null;

  if (parsed.data.phone) {
    phone = normalizePhone(parsed.data.phone);
    if (!phone) {
      return { error: { phone: [await serverT("errors.invalidIdentifier")] } };
    }
  }

  if (!email && !phone) {
    return { error: { form: [await serverT("errors.identifierRequired")] } };
  }

  if (email) {
    const existing = await db.user.findFirst({
      where: { email, id: { not: userId } },
    });
    if (existing) {
      return { error: { email: [await serverT("errors.emailExists")] } };
    }
  }

  if (phone) {
    const existing = await db.user.findFirst({
      where: { phone, id: { not: userId } },
    });
    if (existing) {
      return { error: { phone: [await serverT("errors.phoneExists")] } };
    }
  }

  await db.user.update({
    where: { id: userId },
    data: {
      name: parsed.data.name,
      email,
      phone,
      address: parsed.data.address || null,
      dateOfBirth: parsed.data.dateOfBirth ? new Date(parsed.data.dateOfBirth) : null,
      notes: parsed.data.notes || null,
    },
  });

  revalidatePath("/profile");
  return { success: true };
}

const appTitleSchema = z.object({
  appTitle: z.string().trim().min(1).max(APP_TITLE_MAX_LENGTH),
});

export async function updateAppTitle(formData: FormData): Promise<{ success?: boolean; error?: Record<string, string[]> }> {
  const session = await auth();
  if (!session?.user) throw new Error("Not authenticated");
  const userId = (session.user as { id: string }).id;

  if (!isSuperadminId(userId)) {
    throw new Error("Not authorized");
  }

  const parsed = appTitleSchema.safeParse({
    appTitle: formData.get("appTitle"),
  });

  if (!parsed.success) {
    return { error: { appTitle: [await serverT("profile.appTitleInvalid")] } };
  }

  await db.appSetting.upsert({
    where: { key: APP_TITLE_KEY },
    update: { value: parsed.data.appTitle },
    create: { key: APP_TITLE_KEY, value: parsed.data.appTitle },
  });

  revalidatePath("/", "layout");
  revalidatePath("/profile");
  return { success: true };
}

const changePasswordSchema = z.object({
  currentPassword: z.string().min(1),
  newPassword: z.string().min(6),
  confirmPassword: z.string().min(1),
});

export async function changePassword(formData: FormData): Promise<{ success?: boolean; error?: Record<string, string[]> }> {
  const session = await auth();
  if (!session?.user) throw new Error("Not authenticated");
  const userId = (session.user as { id: string }).id;

  // The superadmin's password is env-controlled and re-provisioned on every
  // login, so a DB change would be silently ignored. Reject defensively.
  if (isSuperadminId(userId)) {
    return { error: { form: [await serverT("errors.superadminEnvManaged")] } };
  }

  const parsed = changePasswordSchema.safeParse({
    currentPassword: formData.get("currentPassword"),
    newPassword: formData.get("newPassword"),
    confirmPassword: formData.get("confirmPassword"),
  });

  if (!parsed.success) {
    return { error: parsed.error.flatten().fieldErrors };
  }

  const { currentPassword, newPassword, confirmPassword } = parsed.data;

  if (newPassword !== confirmPassword) {
    return { error: { confirmPassword: [await serverT("errors.passwordMismatch")] } };
  }

  if (newPassword === currentPassword) {
    return { error: { newPassword: [await serverT("errors.samePassword")] } };
  }

  const user = await db.user.findUnique({ where: { id: userId } });
  if (!user) throw new Error("Not authenticated");

  const valid = await compare(currentPassword, user.passwordHash);
  if (!valid) {
    return { error: { currentPassword: [await serverT("errors.currentPasswordWrong")] } };
  }

  const passwordHash = await hash(newPassword, 12);
  await db.user.update({
    where: { id: userId },
    data: { passwordHash },
  });

  revalidatePath("/profile");
  return { success: true };
}
