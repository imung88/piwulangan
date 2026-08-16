/**
 * @module lib/auth.config
 * @overview Edge-safe NextAuth configuration without DB adapters or Node-specific crypto.
 * @responsibilities
 *   - Define JWT session callbacks and sign-in page routes for middleware usage
 * @exports
 *   - `authConfig`: NextAuth configuration object
 */
import type { NextAuthConfig } from "next-auth";
import type { Role } from "@prisma/client";

// Edge-safe NextAuth config: no Prisma adapter, no bcryptjs, no providers.
// Middleware imports only this; the Credentials provider + adapter live in auth.ts.
export const authConfig = {
  session: { strategy: "jwt" },
  pages: {
    signIn: "/login",
  },
  providers: [],
  callbacks: {
    async jwt({ token, user }) {
      if (user) {
        // The Credentials provider always returns id + role (see src/lib/auth.ts
        // authorize()); @auth/core's User type doesn't know about them.
        const authUser = user as unknown as { id: string; role: Role };
        token.role = authUser.role;
        token.id = authUser.id;
      }
      return token;
    },
    async session({ session, token }) {
      if (session.user) {
        // JWT is typed as Record<string, unknown>; read our fields via narrow
        // casts and only stamp them when both are present (fails closed).
        const role = token.role as Role | undefined;
        const id = token.id as string | undefined;
        if (role && id) {
          session.user.role = role;
          session.user.id = id;
        }
      }
      return session;
    },
  },
} satisfies NextAuthConfig;
