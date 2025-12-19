import { Request, Response } from "express";
import { prisma } from "../config/database";
import cloudinary from "../config/cloudinary";
import streamifier from "streamifier";

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
