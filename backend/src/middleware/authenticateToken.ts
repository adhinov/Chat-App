import { Request, Response, NextFunction } from "express";
import jwt, { JwtPayload } from "jsonwebtoken";

/**
 * Payload JWT yang kita simpan
 */
export interface JwtUserPayload extends JwtPayload {
  id: number;
  email: string;
  username: string;
  role: string;
}

/**
 * Extend Request supaya punya req.user
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
