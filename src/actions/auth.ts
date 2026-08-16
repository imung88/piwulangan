/**
 * @module actions/auth
 * @overview Server actions for authentication (signup, login, logout, rate-limiting).
 * @responsibilities
 *   - Handle user registration with email/phone validation and rate limiting
 *   - Manage credential-based sign in and sign out sessions via NextAuth
 * @exports
 *   - `signup`: Registers a new student account
 *   - `login`: Authenticates existing user credentials
 *   - `logout`: Terminates active user session
 */
"use server";

import { hash } from "bcryptjs";
import { z } from "zod";
import { headers } from "next/headers";
import { db } from "@/lib/db";
import { signIn, signOut } from "@/lib/auth";
import { serverT } from "@/lib/i18n/serverT";
import { isEmail, normalizePhone } from "@/lib/phone";
import { checkRateLimit } from "@/lib/rateLimit";
import { isReservedSuperadminName } from "@/lib/superadmin";
import { AuthError } from "next-auth";
import type { ActionResult } from "@/types/errors";

async function clientIp(): Promise<string> {
  const h = await headers();
  return (
    h.get("x-forwarded-for")?.split(",")[0]?.trim() ||
    h.get("x-real-ip")?.trim() ||
    "unknown"
  );
}

const signupSchema = z.object({
  name: z.string().min(2, "Name must be at least 2 characters"),
  identifier: z.string().min(3, "Enter an email or phone number"),
  password: z.string().min(6, "Password must be at least 6 characters"),
});

export async function signup(formData: FormData): Promise<ActionResult> {
  const ip = await clientIp();
  const rl = checkRateLimit(`signup:${ip}`, { limit: 10, windowMs: 60 * 60 * 1000 });
  if (!rl.allowed) {
    return { success: false, error: await serverT("errors.tooManyAttempts") };
  }

  const parsed = signupSchema.safeParse({
    name: formData.get("name"),
    identifier: formData.get("identifier"),
    password: formData.get("password"),
  });

  if (!parsed.success) {
    return {
      success: false,
      error: await serverT("errors.validationFailed"),
      fieldErrors: parsed.error.flatten().fieldErrors,
    };
  }

  const { name, password } = parsed.data;
  const identifier = parsed.data.identifier.trim();

  if (isReservedSuperadminName(name)) {
    return {
      success: false,
      error: await serverT("errors.validationFailed"),
      fieldErrors: { name: [await serverT("errors.nameReserved")] },
    };
  }

  let email: string | null = null;
  let phone: string | null = null;

  if (isEmail(identifier)) {
    const emailCheck = z.string().email().safeParse(identifier.toLowerCase());
    if (!emailCheck.success) {
      return {
        success: false,
        error: await serverT("errors.validationFailed"),
        fieldErrors: { identifier: [await serverT("errors.invalidIdentifier")] },
      };
    }
    email = emailCheck.data;
  } else {
    phone = normalizePhone(identifier);
    if (!phone) {
      return {
        success: false,
        error: await serverT("errors.validationFailed"),
        fieldErrors: { identifier: [await serverT("errors.invalidIdentifier")] },
      };
    }
  }

  const existingUser = await db.user.findUnique({
    where: email ? { email } : { phone: phone! },
  });

  if (existingUser) {
    const key = email ? "errors.emailExists" : "errors.phoneExists";
    return {
      success: false,
      error: await serverT("errors.validationFailed"),
      fieldErrors: { identifier: [await serverT(key)] },
    };
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

  // Auto-login after signup. On success NextAuth redirects (throwing
  // NEXT_REDIRECT, which the framework handles); the success return below is
  // only a type-safety fallback.
  try {
    await signIn("credentials", {
      identifier,
      password,
      redirectTo: "/dashboard",
    });
  } catch (error) {
    if (error instanceof AuthError) {
      return { success: false, error: await serverT("errors.loginFailedAfterSignup") };
    }
    throw error;
  }
  return { success: true };
}

export async function login(formData: FormData): Promise<ActionResult> {
  const ip = await clientIp();
  const identifier = String(formData.get("identifier") ?? "").trim().toLowerCase();
  const rl = checkRateLimit(`login:${ip}:${identifier}`);
  if (!rl.allowed) {
    return { success: false, error: await serverT("errors.tooManyAttempts") };
  }

  try {
    await signIn("credentials", {
      identifier: formData.get("identifier"),
      password: formData.get("password"),
      redirectTo: "/dashboard",
    });
  } catch (error) {
    if (error instanceof AuthError) {
      return { success: false, error: await serverT("errors.invalidCredentials") };
    }
    throw error;
  }
  return { success: true };
}

export async function logout() {
  await signOut({ redirectTo: "/login" });
}
