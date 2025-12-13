import { Request, Response } from "express";
import jwt from "jsonwebtoken";

// ===============================
// REGISTER (Dummy)
// ===============================
export const register = async (req: Request, res: Response) => {
  console.log("REGISTER BODY =", req.body);
  return res.json({ message: "Register endpoint hit" });
};

// ===============================
// LOGIN (Dummy without DB)
// ===============================
export const login = async (req: Request, res: Response) => {
  console.log("LOGIN BODY =", req.body);

  const { identifier, password } = req.body;

  if (!identifier || !password) {
    return res.status(400).json({ message: "identifier & password required" });
  }

  let user;

  // ADMIN FIX – sesuai perintah: role harus "ADMIN" (huruf besar semua)
  if (identifier === "admin@example.com") {
    user = {
      id: 1,
      email: identifier,
      username: "Admin",
      role: "ADMIN",
    };
  } else {
    user = {
      id: 2,
      email: identifier,
      username: identifier.split("@")[0],
      role: "USER",
    };
  }

  // generate token
  const token = jwt.sign(
    {
      id: user.id,
      email: user.email,
      username: user.username,
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

// ===============================
// GET PROFILE
// ===============================
export const getProfile = async (req: Request, res: Response) => {
  console.log("GET PROFILE");

  return res.json({
    message: "Profile endpoint hit",
    user: req.user, // ✔ hasil decode JWT
  });
};
