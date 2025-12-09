import { Request, Response } from "express";

export const register = (req: Request, res: Response) => {
  res.json({ message: "Register endpoint" });
};

export const login = (req: Request, res: Response) => {
  res.json({ message: "Login endpoint" });
};

export const getProfile = (req: Request, res: Response) => {
  res.json({ message: "Profile endpoint" });
};
