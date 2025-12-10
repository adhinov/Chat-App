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

  // 👉 Dummy user hanya untuk tes FE
  // ❗ Admin hanya boleh login jika email = admin@example.com
  let user;

  if (identifier === "admin@example.com") {
    user = {
      id: 1,
      email: identifier,
      role: "ADMIN",
    };
  } else {
    user = {
      id: 2, // untuk user biasa beri id berbeda agar tidak rancu
      email: identifier,
      role: "user",
    };
  }

  // 👉 Generate JWT
  const token = jwt.sign(
    {
      id: user.id,
      email: user.email,
      role: user.role,
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
    user: req.user, // ⬅️ jadikan profile real dari JWT
  });
};
