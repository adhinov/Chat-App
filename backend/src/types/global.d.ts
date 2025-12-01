import { PrismaClient } from "@prisma/client";

declare global {
  // Agar prisma instance tidak dianggap any oleh TypeScript
  var prisma: PrismaClient | undefined;
}

export {};
