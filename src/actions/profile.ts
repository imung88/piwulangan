"use server";

import { z } from "zod";
import { db } from "@/lib/db";
import { auth } from "@/lib/auth";
import { serverT } from "@/lib/i18n/serverT";
import { normalizePhone } from "@/lib/phone";
import { revalidatePath } from "next/cache";

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
