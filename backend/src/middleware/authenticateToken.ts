import { Request, Response, NextFunction } from "express";
import jwt from "jsonwebtoken";
import { JwtUserPayload } from "../types/jwt";

/**
 * Extend Express Request supaya punya req.user
 */
export interface AuthRequest extends Request {
  user?: JwtUserPayload;
}

/**
 * Middleware Auth JWT
 */
export const authenticateToken = (
  req: AuthRequest,
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

    // inject user ke request
    req.user = decoded;

    next();
  } catch (error) {
    res.status(403).json({ message: "Invalid token" });
  }
};
