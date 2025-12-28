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

    // 1️⃣ Basic validation
    if (!email || !username || !password || !phone) {
      res.status(400).json({ message: "Data tidak lengkap" });
      return;
    }

    // 2️⃣ Hash password
    const hashed = await bcrypt.hash(password, 10);

    // 3️⃣ Create user (Prisma handle UNIQUE)
    const user = await prisma.user.create({
      data: {
        email,
        username,
        password: hashed,
        phone,
        role: "USER",
      },
    });

    // 4️⃣ Generate token (kalau memang mau auto-login)
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

    // 🔥 INTI: HANDLE P2002 DI SINI
    if (error instanceof Prisma.PrismaClientKnownRequestError) {
      if (error.code === "P2002") {
        const targets = error.meta?.target as string[];

        if (targets?.includes("email")) {
          res.status(409).json({
            field: "email",
            message: "Email sudah terdaftar",
          });
          return;
        }

        if (targets?.includes("username")) {
          res.status(409).json({
            field: "username",
            message: "Username sudah digunakan",
          });
          return;
        }

        if (targets?.includes("phone")) {
          res.status(409).json({
            field: "phone",
            message: "Nomor HP sudah digunakan",
          });
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

    if (!identifier || !password) {
      res.status(400).json({
        message: "Identifier & password required",
      });
      return;
    }

    const isEmail = identifier.includes("@");

    const user = await prisma.user.findFirst({
      where: isEmail
        ? { email: identifier }
        : { phone: identifier },
    });

    if (!user || !user.password) {
      res.status(401).json({ message: "Invalid credentials" });
      return;
    }

    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch) {
      res.status(401).json({ message: "Invalid credentials" });
      return;
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
      },
    });
  } catch (error) {
    console.error("GET PROFILE ERROR:", error);
    res.status(500).json({ message: "Server error" });
  }
};