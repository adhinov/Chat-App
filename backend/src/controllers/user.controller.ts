import { Request, Response } from "express";
import { prisma } from "../config/database";
import cloudinary from "../config/cloudinary";

/**
 * ================= UPDATE AVATAR =================
 * req.user -> dari express.d.ts (JWT middleware)
 * req.file -> dari multer
 */
export const updateAvatar = async (
  req: Request,
  res: Response
): Promise<void> => {
  try {
    // 🔐 pastikan user sudah login
    if (!req.user) {
      res.status(401).json({ message: "Unauthorized" });
      return;
    }

    // 📸 pastikan file dikirim
    if (!req.file) {
      res.status(400).json({ message: "No file uploaded" });
      return;
    }

    // ☁️ upload ke Cloudinary
    const uploadResult = await cloudinary.uploader.upload(req.file.path, {
      folder: process.env.CLOUDINARY_FOLDER || "chat_uploads/avatar",
      resource_type: "image",
    });

    // 💾 simpan URL cloudinary ke database
    await prisma.user.update({
      where: { id: req.user.id },
      data: {
        avatar: uploadResult.secure_url,
      },
    });

    // ✅ response ke frontend
    res.json({
      message: "Avatar updated",
      avatar: uploadResult.secure_url,
    });
  } catch (error) {
    console.error("Update avatar error:", error);
    res.status(500).json({ message: "Upload avatar failed" });
  }
};
