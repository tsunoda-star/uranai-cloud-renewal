import { PrismaClient } from "@prisma/client";

/**
 * PrismaClient singleton.
 *
 * In development Next.js hot-reload would otherwise create a new client on
 * every reload and exhaust the connection pool. We cache the instance on
 * `globalThis`. In production a single instance per server process is created.
 */
const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClient | undefined;
};

export const db =
  globalForPrisma.prisma ??
  new PrismaClient({
    log:
      process.env.NODE_ENV === "development"
        ? ["warn", "error"]
        : ["error"],
  });

if (process.env.NODE_ENV !== "production") {
  globalForPrisma.prisma = db;
}
