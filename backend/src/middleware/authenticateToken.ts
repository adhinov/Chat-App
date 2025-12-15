import { Request, Response, NextFunction } from "express";
import jwt from "jsonwebtoken";

// ================= TYPES =================
export interface JwtUserPayload {
  id: number;
  email: string;
  username: string;
  role: string;
}

// ================= MIDDLEWARE =================
export const authenticateToken = (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  const authHeader = req.headers.authorization;

  if (!authHeader?.startsWith("Bearer ")) {
    return res.status(401).json({ message: "Unauthorized" });
  }

  const token = authHeader.split(" ")[1];

  try {
    const decoded = jwt.verify(
      token,
      process.env.JWT_SECRET as string
    ) as JwtUserPayload;

    // 🔥 Inject ke req (Express allow this)
    (req as any).user = decoded;

    next();
  } catch {
    return res.status(403).json({ message: "Invalid token" });
  }
};
