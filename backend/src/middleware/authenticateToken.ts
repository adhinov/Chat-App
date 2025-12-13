import { Request, Response, NextFunction } from "express";
import jwt from "jsonwebtoken";

/**
 * Payload JWT yang kita pakai di seluruh app
 */
export interface JwtUserPayload {
  id: number;
  email: string;
  username: string;
  role: "ADMIN" | "USER";
}

/**
 * Extend Express Request
 */
export interface AuthRequest extends Request {
  user?: JwtUserPayload;
}

export const authenticateToken = (
  req: AuthRequest,
  res: Response,
  next: NextFunction
) => {
  try {
    const authHeader = req.headers.authorization;

    if (!authHeader || !authHeader.startsWith("Bearer ")) {
      return res.status(401).json({ message: "No token provided" });
    }

    const token = authHeader.split(" ")[1];

    const decoded = jwt.verify(
      token,
      process.env.JWT_SECRET as string
    ) as JwtUserPayload;

    // ✅ INI PALING PENTING
    req.user = decoded;

    next();
  } catch (err) {
    console.error("AUTH TOKEN ERROR =", err);
    return res.status(403).json({ message: "Invalid or expired token" });
  }
};
