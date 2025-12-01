import { PrismaClient } from "@prisma/client";

declare global {
  // Tanpa index signature → PrismaClient atau undefined
  // Tidak bikin TS error "any"
  // Tidak merusak globalThis
  var prismaGlobal: PrismaClient | undefined;
}

let prisma: PrismaClient;

if (process.env.NODE_ENV === "production") {
  prisma = new PrismaClient();
} else {
  if (!global.prismaGlobal) {
    global.prismaGlobal = new PrismaClient();
  }
  prisma = global.prismaGlobal;
}

export const connectDB = async () => {
  try {
    await prisma.$connect();
    console.log("PostgreSQL database connected successfully");
  } catch (error) {
    console.error("Database connection error:", error);
    process.exit(1);
  }
};

export { prisma };
