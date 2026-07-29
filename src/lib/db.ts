import { PrismaClient } from "@prisma/client";
import { PrismaLibSQL } from "@prisma/adapter-libsql";

const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClient | undefined;
};

// Production (Vercel) uses Turso via the libSQL driver adapter.
// Local dev uses the plain SQLite file from DATABASE_URL (file:./dev.db).
function createClient() {
  const log: ("query" | "error")[] =
    process.env.NODE_ENV === "development" ? ["query"] : [];

  if (process.env.TURSO_DATABASE_URL) {
    const adapter = new PrismaLibSQL({
      url: process.env.TURSO_DATABASE_URL,
      authToken: process.env.TURSO_AUTH_TOKEN,
    });
    return new PrismaClient({ adapter, log });
  }

  return new PrismaClient({ log });
}

export const db = globalForPrisma.prisma ?? createClient();

if (process.env.NODE_ENV !== "production") globalForPrisma.prisma = db;
