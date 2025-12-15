import { Request, Response, NextFunction } from "express";
import jwt, { JwtPayload } from "jsonwebtoken";

// ===============================
// EXTEND EXPRESS REQUEST
// ===============================
declare global {
  namespace Express {
    interface Request {
      user?: {
        id: number;        // 🔥 users.id (PRIMARY KEY)
        email: string;
        username: string;
      };
    }
  }
}

// ===============================
// JWT PAYLOAD TYPE
// ===============================
interface TokenPayload extends JwtPayload {
  id: number;        // users.id
  email: string;
  username: string;
}

// ===============================
// MIDDLEWARE
// ===============================
export const verifyToken = (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  const authHeader = req.headers.authorization;

  if (!authHeader || !authHeader.startsWith("Bearer ")) {
    return res.status(401).json({
      message: "Unauthorized: token missing",
    });
  }

  const token = authHeader.split(" ")[1];

  try {
    const decoded = jwt.verify(
      token,
      process.env.JWT_SECRET as string
    ) as TokenPayload;

    // 🔥 INI KUNCI UTAMA (WAJIB)
    req.user = {
      id: decoded.id,           // users.id (DB)
      email: decoded.email,
      username: decoded.username,
    };

    next();
  } catch (err) {
    return res.status(403).json({
      message: "Invalid or expired token",
    });
  }
};
