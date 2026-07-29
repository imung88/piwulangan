"use server";

import { hash } from "bcryptjs";
import { z } from "zod";
import { db } from "@/lib/db";
import { signIn, signOut } from "@/lib/auth";
import { serverT } from "@/lib/i18n/serverT";
import { isEmail, normalizePhone } from "@/lib/phone";
import { AuthError } from "next-auth";

const signupSchema = z.object({
  name: z.string().min(2, "Name must be at least 2 characters"),
  identifier: z.string().min(3, "Enter an email or phone number"),
  password: z.string().min(6, "Password must be at least 6 characters"),
});

export async function signup(formData: FormData) {
  const parsed = signupSchema.safeParse({
    name: formData.get("name"),
    identifier: formData.get("identifier"),
    password: formData.get("password"),
  });

  if (!parsed.success) {
    return { error: parsed.error.flatten().fieldErrors };
  }

  const { name, password } = parsed.data;
  const identifier = parsed.data.identifier.trim();

  let email: string | null = null;
  let phone: string | null = null;

  if (isEmail(identifier)) {
    const emailCheck = z.string().email().safeParse(identifier.toLowerCase());
    if (!emailCheck.success) {
      return { error: { identifier: [await serverT("errors.invalidIdentifier")] } };
    }
    email = emailCheck.data;
  } else {
    phone = normalizePhone(identifier);
    if (!phone) {
      return { error: { identifier: [await serverT("errors.invalidIdentifier")] } };
    }
  }

  const existingUser = await db.user.findUnique({
    where: email ? { email } : { phone: phone! },
  });

  if (existingUser) {
    const key = email ? "errors.emailExists" : "errors.phoneExists";
    return { error: { identifier: [await serverT(key)] } };
  }

  const passwordHash = await hash(password, 12);

  await db.user.create({
    data: {
      name,
      email,
      phone,
      passwordHash,
      role: "STUDENT", // Default role
    },
  });

  // Auto-login after signup
  try {
    await signIn("credentials", {
      identifier,
      password,
      redirectTo: "/dashboard",
    });
  } catch (error) {
    if (error instanceof AuthError) {
      return { error: { form: [await serverT("errors.loginFailedAfterSignup")] } };
    }
    throw error;
  }
}

export async function login(formData: FormData) {
  try {
    await signIn("credentials", {
      identifier: formData.get("identifier"),
      password: formData.get("password"),
      redirectTo: "/dashboard",
    });
  } catch (error) {
    if (error instanceof AuthError) {
      return { error: await serverT("errors.invalidCredentials") };
    }
    throw error;
  }
}

export async function logout() {
  await signOut({ redirectTo: "/login" });
}
