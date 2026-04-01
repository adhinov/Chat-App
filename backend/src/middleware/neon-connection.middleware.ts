import { Request, Response, NextFunction } from "express";
import { ensureConnection } from "../lib/db-utils";

/**
 * 🔥 Middleware: Ensure Neon database is awake and connected
 * Place this BEFORE your routes that need database access
 */
export async function ensureNeonConnection(
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    await ensureConnection();
    next();
  } catch (error) {
    console.error("❌ Failed to connect to Neon database:", error);
    res.status(503).json({
      error: "Database connection failed",
      message: "Unable to connect to database. Please try again.",
    });
  }
}

/**
 * 🏓 Optional: Periodic ping to keep Neon awake
 * Use this in production if you want to prevent auto-suspend
 */
import { pingDatabase } from "../lib/db-utils";

export function startNeonKeepalive(intervalMs: number = 4 * 60 * 1000) {
  // Ping every 4 minutes (Neon auto-suspends after 5 min)
  console.log(`🏓 Starting Neon keepalive (ping every ${intervalMs / 1000}s)`);
  
  const keepaliveInterval = setInterval(async () => {
    const isAlive = await pingDatabase();
    if (!isAlive) {
      console.warn("⚠️  Neon keepalive ping failed");
    }
  }, intervalMs);

  // Cleanup on shutdown
  process.on("SIGTERM", () => {
    console.log("🛑 Stopping Neon keepalive");
    clearInterval(keepaliveInterval);
  });

  return keepaliveInterval;
}
