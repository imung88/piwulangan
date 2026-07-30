import NextAuth from "next-auth";
import Credentials from "next-auth/providers/credentials";
import { PrismaAdapter } from "@auth/prisma-adapter";
import { compare, hash } from "bcryptjs";
import { timingSafeEqual } from "crypto";
import { db } from "@/lib/db";
import { authConfig } from "@/lib/auth.config";
import { isEmail, normalizePhone } from "@/lib/phone";
import { SUPERADMIN_ID, SUPERADMIN_NAME } from "@/lib/superadmin";

// The superadmin is authenticated against environment variables, not a seed.
// A single DB row (SUPERADMIN_ID) is provisioned lazily on first login so that
// foreign keys (course owner, announcement author, etc.) stay valid.
function safeEqual(a: string, b: string): boolean {
  const ab = Buffer.from(a);
  const bb = Buffer.from(b);
  if (ab.length !== bb.length) return false;
  return timingSafeEqual(ab, bb);
}

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

        // Env-derived superadmin: credentials live in the environment, not the
        // database. This account is authenticated exclusively against the env
        // vars — it never falls back to the DB password path.
        const superEmail = process.env.SUPERADMIN_EMAIL?.trim().toLowerCase();
        if (superEmail && identifier.toLowerCase() === superEmail) {
          const superPassword = process.env.SUPERADMIN_PASSWORD;
          if (!superPassword || !safeEqual(password, superPassword)) {
            return null;
          }
          const passwordHash = await hash(superPassword, 12);
          const admin = await db.user.upsert({
            where: { id: SUPERADMIN_ID },
            update: {
              email: superEmail,
              name: SUPERADMIN_NAME,
              passwordHash,
              role: "ADMIN",
              active: true,
            },
            create: {
              id: SUPERADMIN_ID,
              email: superEmail,
              name: SUPERADMIN_NAME,
              passwordHash,
              role: "ADMIN",
            },
          });
          return {
            id: admin.id,
            email: admin.email,
            name: admin.name,
            role: admin.role,
          };
        }

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
