import { Request, Response } from "express";
import { prisma } from "../config/database";

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
    if (!req.user) {
      res.status(401).json({ message: "Unauthorized" });
      return;
    }

    if (!req.file) {
      res.status(400).json({ message: "No file uploaded" });
      return;
    }

    const avatarUrl = `${req.protocol}://${req.get(
      "host"
    )}/uploads/avatar/${req.file.filename}`;

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
