import prisma from "../lib/prisma";

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
