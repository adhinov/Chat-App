import { Response } from "express";
import { prisma } from "../config/database";
import { AuthRequest } from "../middleware/authenticateToken";

export const updateAvatar = async (
  req: AuthRequest,
  res: Response
): Promise<void> => {
  try {
    if (!req.user || !req.file) {
      res.status(400).json({ message: "Invalid request" });
      return;
    }

    const avatarUrl = `${req.protocol}://${req.get(
      "host"
    )}/uploads/avatar/${req.file.filename}`;

    await prisma.user.update({
      where: { id: req.user.id },
      data: { avatar: avatarUrl },
    });

    res.json({ avatar: avatarUrl });
  } catch (error) {
    console.error("Update avatar error:", error);
    res.status(500).json({ message: "Upload avatar failed" });
  }
};
