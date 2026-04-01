import prisma, { ensureNeonConnection } from "./prisma";

/**
 * 🔄 NEON-OPTIMIZED: Retry database operation with exponential backoff
 * Handles Neon's auto-suspend/wake behavior
 */
export async function retryOperation<T>(
  operation: () => Promise<T>,
  maxRetries = 3,
  delayMs = 2000 // Increased for Neon wake-up time
): Promise<T> {
  let lastError: any;

  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    try {
      // Ensure connection is alive before operation (Neon-specific)
      if (attempt > 1) {
        await ensureNeonConnection();
      }
      
      return await operation();
    } catch (error: any) {
      lastError = error;

      // Check if it's a Neon-specific connection error
      const isNeonConnectionError =
        error.code === "P1001" || // Can't reach database
        error.code === "P1008" || // Operations timed out
        error.code === "P1017" || // Server closed connection
        error.code === "P2024" || // Connection pool timeout
        error.message?.includes("terminating connection") ||
        error.message?.includes("Connection terminated") ||
        error.message?.includes("connection was closed") ||
        error.message?.includes("Connection pool timeout") ||
        // Neon-specific errors
        error.message?.includes("compute is not yet available") ||
        error.message?.includes("connection attempt failed");

      if (!isNeonConnectionError || attempt === maxRetries) {
        console.error(`❌ Database operation failed after ${attempt} attempts:`, error);
        throw error;
      }

      const backoffDelay = delayMs * Math.pow(1.5, attempt - 1); // Exponential backoff
      console.warn(
        `⚠️  Neon connection error (attempt ${attempt}/${maxRetries}), retrying in ${Math.round(backoffDelay)}ms...`
      );

      await new Promise((resolve) => setTimeout(resolve, backoffDelay));

      // Force reconnect for Neon
      try {
        await prisma.$disconnect();
        await prisma.$connect();
        console.log("🔄 Reconnected to Neon database");
      } catch (connectError) {
        console.error("⚠️  Reconnection attempt failed:", connectError);
      }
    }
  }

  throw lastError;
}

/**
 * 🔍 Check Neon database connection health
 */
export async function checkDatabaseConnection(): Promise<boolean> {
  try {
    await prisma.$queryRaw`SELECT 1`;
    return true;
  } catch (error) {
    console.error("❌ Neon connection check failed:", error);
    return false;
  }
}

/**
 * 🔄 Ensure Neon database is connected and awake
 * Neon databases auto-suspend, this wakes them up
 */
export async function ensureConnection(): Promise<void> {
  try {
    await ensureNeonConnection();
  } catch (error) {
    console.error("❌ Failed to ensure Neon connection:", error);
    throw error;
  }
}

/**
 * 🏓 Ping Neon database (useful for keeping it awake)
 */
export async function pingDatabase(): Promise<boolean> {
  try {
    const start = Date.now();
    await prisma.$queryRaw`SELECT 1`;
    const duration = Date.now() - start;
    console.log(`🏓 Neon ping: ${duration}ms`);
    return true;
  } catch (error) {
    console.error("❌ Neon ping failed:", error);
    return false;
  }
}
