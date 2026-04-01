import { PrismaClient } from "@prisma/client";

declare global {
  // eslint-disable-next-line no-var
  var prisma: PrismaClient | undefined;
}

// 🔥 NEON-OPTIMIZED PRISMA CLIENT
const prisma =
  global.prisma ??
  new PrismaClient({
    log: process.env.NODE_ENV === "development" ? ["query", "error", "warn"] : ["error"],
    
    datasources: {
      db: {
        url: process.env.DATABASE_URL,
      },
    },
  });

// 🔥 NEON-SPECIFIC: Handle serverless cold starts
// Neon databases auto-suspend after inactivity, this ensures proper reconnection
prisma.$connect().catch((error) => {
  console.error("❌ Failed to connect to Neon database:", error);
  // Don't exit process in development, let retry logic handle it
  if (process.env.NODE_ENV === "production") {
    process.exit(1);
  }
});

// 🔥 HEALTH CHECK & AUTO-RECONNECT for Neon
let isConnecting = false;

export async function ensureNeonConnection() {
  if (isConnecting) return;
  
  try {
    isConnecting = true;
    await prisma.$queryRaw`SELECT 1`;
  } catch (error: any) {
    console.warn("⚠️  Neon connection lost, attempting to reconnect...");
    try {
      await prisma.$connect();
      console.log("✅ Reconnected to Neon database");
    } catch (reconnectError) {
      console.error("❌ Failed to reconnect to Neon:", reconnectError);
      throw reconnectError;
    }
  } finally {
    isConnecting = false;
  }
}

// 🔥 GRACEFUL SHUTDOWN
const gracefulShutdown = async (signal: string) => {
  console.log(`🔌 ${signal} received, disconnecting from Neon...`);
  try {
    await prisma.$disconnect();
    console.log("✅ Successfully disconnected from Neon");
    process.exit(0);
  } catch (error) {
    console.error("❌ Error during disconnect:", error);
    process.exit(1);
  }
};

process.on("beforeExit", async () => {
  await prisma.$disconnect();
});

process.on("SIGINT", () => gracefulShutdown("SIGINT"));
process.on("SIGTERM", () => gracefulShutdown("SIGTERM"));

// 🔥 PREVENT MULTIPLE INSTANCES IN DEVELOPMENT
if (process.env.NODE_ENV !== "production") {
  global.prisma = prisma;
}

export default prisma;