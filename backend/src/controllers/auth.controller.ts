import { Request, Response } from "express";
import prisma from "../config/prisma";
import jwt from "jsonwebtoken";
import bcrypt from "bcryptjs";
import { JwtUserPayload } from "../types/jwt";
import { Prisma } from "@prisma/client";

/* ================= REGISTER ================= */
export const register = async (
  req: Request,
  res: Response
): Promise<void> => {
  try {
    const { email, username, password, phone } = req.body;

    if (!email || !username || !password || !phone) {
      res.status(400).json({ message: "Data tidak lengkap" });
      return;
    }

    const hashed = await bcrypt.hash(password, 10);

    const user = await prisma.user.create({
      data: {
        email,
        username,
        password: hashed,
        phone,
        role: "USER",
      },
    });

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

    res.status(201).json({
      message: "Register success",
      token,
      user: {
        id: user.id,
        email: user.email,
        username: user.username,
        phone: user.phone,
        role: user.role,
      },
    });
  } catch (error: any) {
    if (error instanceof Prisma.PrismaClientKnownRequestError) {
      if (error.code === "P2002") {
        const targets = error.meta?.target as string[];

        if (targets?.includes("email")) {
          res.status(409).json({ field: "email", message: "Email sudah terdaftar" });
          return;
        }

        if (targets?.includes("username")) {
          res.status(409).json({ field: "username", message: "Username sudah digunakan" });
          return;
        }

        if (targets?.includes("phone")) {
          res.status(409).json({ field: "phone", message: "Nomor HP sudah digunakan" });
          return;
        }
      }
    }

    console.error("REGISTER ERROR:", error);
    res.status(500).json({ message: "Register failed" });
  }
};

/* ================= LOGIN ================= */
export const login = async (
  req: Request,
  res: Response
): Promise<void> => {
  try {
    const { identifier, password } = req.body;

    // 1️⃣ VALIDATION
    if (!identifier || !password) {
      res.status(400).json({ message: "Identifier & password required" });
      return;
    }

    const isEmail = identifier.includes("@");

    // 2️⃣ FIND USER
    const user = await prisma.user.findFirst({
      where: isEmail ? { email: identifier } : { phone: identifier },
    });

    if (!user) {
      res.status(404).json({
        code: "USER_NOT_FOUND",
        message: "User belum terdaftar",
      });
      return;
    }

    if (!user.password) {
      res.status(401).json({
        code: "PASSWORD_NOT_SET",
        message: "Password belum disetel",
      });
      return;
    }

    // 3️⃣ CHECK PASSWORD
    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch) {
      res.status(401).json({
        code: "INVALID_PASSWORD",
        message: "Password salah",
      });
      return;
    }

    // =========================
    // 🔑 LOGIN TRACKING (BENAR)
    // =========================

    // SIMPAN LAST LOGIN LAMA (ini previous login)
    const previousLogin = user.lastLogin;

    // UPDATE LOGIN SEKARANG
    await prisma.user.update({
      where: { id: user.id },
      data: {
        lastLogin: new Date(),
      },
    });

    // 4️⃣ GENERATE TOKEN
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

    // 5️⃣ RESPONSE
    res.json({
      message: "Login success",
      token,
      user: {
        id: user.id,
        email: user.email,
        username: user.username,
        phone: user.phone,
        avatar: user.avatar,
        role: user.role,

        // 👇 YANG DIKIRIM KE UI = LOGIN SEBELUMNYA
        lastLogin: previousLogin,
      },
    });
  } catch (error) {
    console.error("LOGIN ERROR:", error);
    res.status(500).json({ message: "Login failed" });
  }
};

/* ================= GET ME ================= */
export const getMe = async (req: Request, res: Response) => {
  try {
    if (!req.user) {
      return res.status(401).json({ message: "Unauthorized" });
    }

    const user = await prisma.user.findUnique({
      where: { id: req.user.id },
      select: {
        id: true,
        username: true,
        email: true,
        avatar: true,
        role: true,
        lastLogin: true,
      },
    });

    res.json(user);
  } catch (err) {
    console.error("Get me error:", err);
    res.status(500).json({ message: "Failed to fetch user" });
  }
};

/* ================= PROFILE ================= */
export const getProfile = async (
  req: Request,
  res: Response
): Promise<void> => {
  try {
    if (!req.user) {
      res.status(401).json({ message: "Unauthorized" });
      return;
    }

    const user = await prisma.user.findUnique({
      where: { id: req.user.id },
    });

    if (!user) {
      res.status(404).json({ message: "User not found" });
      return;
    }

    res.json({
      user: {
        id: user.id,
        email: user.email,
        username: user.username,
        phone: user.phone,
        avatar: user.avatar,
        role: user.role,
        lastLogin: user.lastLogin,
      },
    });
  } catch (error) {
    console.error("GET PROFILE ERROR:", error);
    res.status(500).json({ message: "Server error" });
  }
};
