import { PrismaClient } from "@prisma/client";

const globalForPrisma = globalThis as unknown as { prisma?: PrismaClient };

export const prisma =
  globalForPrisma.prisma ??
  new PrismaClient({
    log: ["warn", "error"], // add "query" to see SQL in dev
  });

if (process.env.NODE_ENV !== "production") globalForPrisma.prisma = prisma;
