import { Request, Response, NextFunction } from "express";

export const authorizeAdmin = (
  req: Request & { user?: any },
  res: Response,
  next: NextFunction
) => {
  // pastikan user terbaca dari authenticateToken
  if (!req.user) {
    return res.status(401).json({ error: "Unauthorized" });
  }

  console.log("ROLE CHECK:", req.user.role);

  // cek case-sensitive ("ADMIN" sesuai payload JWT kamu)
  if (req.user.role !== "ADMIN") {
    return res.status(403).json({ error: "Forbidden: Admin only" });
  }

  next();
};
