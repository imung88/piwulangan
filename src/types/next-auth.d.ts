import { DefaultSession } from "next-auth";

declare module "next-auth" {
  interface Session {
    user: {
      id: string;
      role: "ADMIN" | "INSTRUCTOR" | "STUDENT" | "GUARDIAN";
    } & DefaultSession["user"];
  }
}

declare module "next-auth/jwt" {
  interface JWT {
    role: "ADMIN" | "INSTRUCTOR" | "STUDENT" | "GUARDIAN";
    id: string;
  }
}
