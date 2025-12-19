import { Request, Response, NextFunction } from "express";
import jwt from "jsonwebtoken";
import { JwtUserPayload } from "../types/jwt";

/**
 * ================= AUTHENTICATE TOKEN (JWT) =================
 * - Mengisi req.user dari JWT
 * - req.user sudah di-augment via express.d.ts
 */
export const authenticateToken = (
  req: Request,
  res: Response,
  next: NextFunction
): void => {
  const authHeader = req.headers.authorization;

  if (!authHeader || !authHeader.startsWith("Bearer ")) {
    res.status(401).json({ message: "Unauthorized" });
    return;
  }

  const token = authHeader.split(" ")[1];

  try {
    const decoded = jwt.verify(
      token,
      process.env.JWT_SECRET as string
    ) as JwtUserPayload;

    // ✅ req.user AMAN karena express.d.ts
    req.user = decoded;

    next();
  } catch (error) {
    console.error("JWT error:", error);
    res.status(403).json({ message: "Invalid or expired token" });
  }
};
