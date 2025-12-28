import { Request, Response } from "express";
import { prisma } from "../config/database";
import cloudinary from "../config/cloudinary";
import streamifier from "streamifier";
import { Prisma } from "@prisma/client";

export const updateAvatar = async (
  req: Request & { user?: { id: number } },
  res: Response
): Promise<void> => {
  try {
    if (!req.user) {
      res.status(401).json({ message: "Unauthorized" });
      return;
    }

    if (!req.file) {
      res.status(400).json({ message: "File tidak ditemukan" });
      return;
    }

    // 🔥 upload buffer ke cloudinary
    const uploadFromBuffer = (): Promise<string> => {
      return new Promise((resolve, reject) => {
        const stream = cloudinary.uploader.upload_stream(
          {
            folder: "chat_uploads/avatar",
            resource_type: "image",
            transformation: [
              { width: 300, height: 300, crop: "fill" },
            ],
          },
          (error, result) => {
            if (error || !result) {
              return reject(error);
            }
            resolve(result.secure_url);
          }
        );

        streamifier.createReadStream(req.file!.buffer).pipe(stream);
      });
    };

    const avatarUrl = await uploadFromBuffer();

    // 💾 simpan ke database
    await prisma.user.update({
      where: { id: req.user.id },
      data: { avatar: avatarUrl },
    });

    res.json({
      message: "Avatar updated",
      avatar: avatarUrl,
    });
  } catch (error) {
    console.error("Update avatar error:", error);
    res.status(500).json({ message: "Upload avatar failed" });
  }
};

export const updateProfile = async (
  req: Request & { user?: { id: number } },
  res: Response
): Promise<void> => {
  try {
    if (!req.user) {
      res.status(401).json({ message: "Unauthorized" });
      return;
    }

    const { username, phone } = req.body;

    if (!username || !phone) {
      res.status(400).json({ message: "Username dan nomor HP wajib diisi" });
      return;
    }

    const updatedUser = await prisma.user.update({
      where: { id: req.user.id },
      data: {
        username,
        phone,
      },
      select: {
        id: true,
        username: true,
        phone: true,
        avatar: true,
      },
    });

    res.json({
      message: "Profile updated",
      user: updatedUser,
    });
  } catch (error: any) {
    // 🔥 HANDLE UNIQUE CONSTRAINT (username / phone)
    if (error instanceof Prisma.PrismaClientKnownRequestError) {
      if (error.code === "P2002") {
        const targets = error.meta?.target as string[];

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

    console.error("Update profile error:", error);
    res.status(500).json({ message: "Update profile failed" });
  }
};

