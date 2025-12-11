import { Request, Response } from "express";
import jwt from "jsonwebtoken";

export const register = async (req: Request, res: Response) => {
  console.log("REGISTER BODY =", req.body);
  return res.json({ message: "Register endpoint hit" });
};

export const login = async (req: Request, res: Response) => {
  console.log("LOGIN BODY =", req.body);

  const { identifier, password } = req.body;

  if (!identifier || !password) {
    return res.status(400).json({ message: "identifier & password required" });
  }

  // 👉 Dummy login untuk testing FE
  let user;

  if (identifier === "admin@example.com") {
    user = {
      id: 1,
      email: identifier,
      username: "Admin",
      role: "ADMIN",   // ⬅️ FIX: selalu CAPITAL
    };
  } else {
    user = {
      id: 2,
      email: identifier,
      username: identifier.split("@")[0],
      role: "USER",    // ⬅️ lebih baik konsisten kapital juga
    };
  }

  // 👉 Generate JWT
  const token = jwt.sign(
    {
      id: user.id,
      email: user.email,
      username: user.username,
      role: user.role, // ⬅️ sekarang pasti "ADMIN" atau "USER"
    },
    process.env.JWT_SECRET as string,
    { expiresIn: "7d" }
  );

  return res.json({
    message: "Login success",
    token,
    user,
  });
};

export const getProfile = async (req: Request, res: Response) => {
  console.log("GET PROFILE");
  return res.json({
    message: "Profile endpoint hit",
    user: req.user,
  });
};
