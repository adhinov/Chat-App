import { Request, Response, NextFunction } from "express";
import jwt, { JwtPayload } from "jsonwebtoken";

export interface AuthRequest extends Request {
  user?: JwtPayload | string;
}

export const authenticateToken = (
  req: AuthRequest,
  res: Response,
  next: NextFunction
) => {
  const authHeader = req.headers["authorization"];
  const token = authHeader?.split(" ")[1];

  if (!token) {
    return res.status(401).json({ message: "No token provided" });
  }

  jwt.verify(
    token,
    process.env.JWT_SECRET as string,
    (err, decoded: any) => {
      if (err) {
        console.error("JWT VERIFY ERROR =", err);
        return res.status(403).json({ message: "Invalid token" });
      }

      // ⬅️ FIX PENTING: assign langsung payload JWT ke req.user
      req.user = decoded;

      next();
    }
  );
};
