import { Request, Response } from "express";
import jwt from "jsonwebtoken";
import prisma from "../config/prisma";
import bcrypt from "bcryptjs";
import { JwtUserPayload } from "../middleware/authenticateToken";

// ================= REGISTER =================
export const register = async (req: Request, res: Response) => {
  try {
    const { email, username, password, phone } = req.body;

    if (!email || !username || !password) {
      return res.status(400).json({ message: "Data tidak lengkap" });
    }

    const existing = await prisma.user.findUnique({ where: { email } });
    if (existing) {
      return res.status(409).json({ message: "Email sudah terdaftar" });
    }

    const hashed = await bcrypt.hash(password, 10);

    const user = await prisma.user.create({
      data: {
        email,
        username,
        password: hashed,
        phone, // ✅ INI JAWABAN kenapa tadi NULL
        role: "USER",
      },
    });

    // 🔥 AUTO LOGIN SETELAH SIGNUP
    const token = jwt.sign(
      {
        id: user.id,
        email: user.email,
        username: user.username,
        role: user.role,
      } as JwtUserPayload,
      process.env.JWT_SECRET as string,
      { expiresIn: "7d" }
    );

    return res.status(201).json({
      message: "Register success",
      token,
      user,
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Register failed" });
  }
};

// ================= LOGIN =================
export const login = async (req: Request, res: Response) => {
  const { identifier, password } = req.body;

  const user = await prisma.user.findUnique({
    where: { email: identifier },
  });

  if (!user || !user.password) {
    return res.status(401).json({ message: "Invalid credentials" });
  }

  const match = await bcrypt.compare(password, user.password);
  if (!match) {
    return res.status(401).json({ message: "Invalid credentials" });
  }

  const token = jwt.sign(
    {
      id: user.id,
      email: user.email,
      username: user.username,
      role: user.role,
    } as JwtUserPayload,
    process.env.JWT_SECRET as string,
    { expiresIn: "7d" }
  );

  res.json({ token, user });
};

// ================= PROFILE =================
export const getProfile = async (req: Request, res: Response) => {
  res.json({
    user: (req as any).user,
  });
};
