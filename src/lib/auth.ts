import NextAuth from "next-auth";
import Credentials from "next-auth/providers/credentials";
import { PrismaAdapter } from "@auth/prisma-adapter";
import { compare } from "bcryptjs";
import { db } from "@/lib/db";
import { authConfig } from "@/lib/auth.config";
import { isEmail, normalizePhone } from "@/lib/phone";

export const {
  handlers,
  signIn,
  signOut,
  auth,
} = NextAuth({
  ...authConfig,
  adapter: PrismaAdapter(db),
  providers: [
    Credentials({
      name: "credentials",
      credentials: {
        identifier: { label: "Email or Phone", type: "text" },
        password: { label: "Password", type: "password" },
      },
      async authorize(credentials) {
        if (!credentials?.identifier || !credentials?.password) {
          return null;
        }

        const identifier = (credentials.identifier as string).trim();
        const password = credentials.password as string;

        let user;
        if (isEmail(identifier)) {
          user = await db.user.findUnique({
            where: { email: identifier.toLowerCase() },
          });
        } else {
          const phone = normalizePhone(identifier);
          if (!phone) return null;
          user = await db.user.findUnique({ where: { phone } });
        }

        if (!user || !user.active) {
          return null;
        }

        const isPasswordValid = await compare(password, user.passwordHash);

        if (!isPasswordValid) {
          return null;
        }

        return {
          id: user.id,
          email: user.email,
          name: user.name,
          role: user.role,
        };
      },
    }),
  ],
});
