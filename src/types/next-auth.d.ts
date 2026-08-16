import type { DefaultSession } from "next-auth";
import type { Role } from "@prisma/client";

// Types `session.user.id` and `session.user.role` everywhere (pages, actions,
// middleware). The values are populated by the callbacks in src/lib/auth.config.ts.
declare module "next-auth" {
  interface Session {
    user: {
      id: string;
      role: Role;
    } & DefaultSession["user"];
  }

  interface User {
    id: string;
    role: Role;
  }
}

// Note: `next-auth/jwt` re-exports @auth/core's JWT rather than declaring its
// own, so augmenting it here has no effect on callback types. Access extra
// token fields via a narrow cast in auth.config.ts instead.
