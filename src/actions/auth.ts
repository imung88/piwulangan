"use server";

import { hash } from "bcryptjs";
import { z } from "zod";
import { db } from "@/lib/db";
import { signIn, signOut } from "@/lib/auth";
import { serverT } from "@/lib/i18n/serverT";
import { AuthError } from "next-auth";

const signupSchema = z.object({
  name: z.string().min(2, "Name must be at least 2 characters"),
  email: z.string().email("Invalid email address"),
  password: z.string().min(6, "Password must be at least 6 characters"),
});

export async function signup(formData: FormData) {
  const parsed = signupSchema.safeParse({
    name: formData.get("name"),
    email: formData.get("email"),
    password: formData.get("password"),
  });

  if (!parsed.success) {
    return { error: parsed.error.flatten().fieldErrors };
  }

  const { name, email, password } = parsed.data;

  // Check if user already exists
  const existingUser = await db.user.findUnique({
    where: { email },
  });

  if (existingUser) {
    return { error: { email: [await serverT("errors.emailExists")] } };
  }

  // Hash password and create user
  const passwordHash = await hash(password, 12);

  await db.user.create({
    data: {
      name,
      email,
      passwordHash,
      role: "STUDENT", // Default role
    },
  });

  // Auto-login after signup
  try {
    await signIn("credentials", {
      email,
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
      email: formData.get("email"),
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
