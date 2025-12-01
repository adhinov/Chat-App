import { Request, Response, NextFunction } from "express";

export const authorizeAdmin = (
  req: Request & { user?: any },
  res: Response,
  next: NextFunction
) => {
  if (!req.user) {
    return res.status(401).json({ error: "User not authenticated" });
  }

  if (req.user.role !== "ADMIN") {
    return res.status(403).json({ error: "Access denied. Admin only" });
  }

  next();
};
