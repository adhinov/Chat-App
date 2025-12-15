import { Request, Response } from "express";
import prisma from "../config/prisma";

// ===============================
// Helper
// ===============================
const normalize = (m: any) => ({
  id: m.id,
  sender: {
    id: m.sender?.id,
    username: m.sender?.username,
    email: m.sender?.email,
  },
  text: m.text || null,

  // 🔥 PENTING: frontend pakai `image`
  image: m.fileUrl || null,

  createdAt: m.createdAt,
});

// ===============================
// GET ALL
// ===============================
export const getAllMessages = async (req: Request, res: Response) => {
  try {
    const messages = await prisma.messages.findMany({
      orderBy: { createdAt: "asc" },
      include: {
        sender: { select: { id: true, username: true, email: true } },
      },
    });

    res.json(messages.map(normalize));
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Server error" });
  }
};

// ===============================
// SEND TEXT
// ===============================
export const sendTextMessage = async (req: Request, res: Response) => {
  try {
    const user = (req as any).user;

    if (!user) {
      return res.status(401).json({ message: "Unauthorized" });
    }

    const { text } = req.body;

    if (!text?.trim()) {
      return res.status(400).json({ message: "Message required" });
    }

    const msg = await prisma.messages.create({
      data: {
        senderId: user.id,
        text: text.trim(),
      },
      include: {
        sender: { select: { id: true, username: true, email: true } },
      },
    });

    const normalized = normalize(msg);

    req.app.get("io").emit("receive_message", normalized);

    res.json(normalized);
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Server error" });
  }
};

// ===============================
// UPLOAD IMAGE
// ===============================
export const uploadMessageImage = async (req: Request, res: Response) => {
  try {
    const user = (req as any).user;
    const file = req.file;

    if (!user) {
      return res.status(401).json({ message: "Unauthorized" });
    }

    if (!file) {
      return res.status(400).json({ message: "File required" });
    }

    const msg = await prisma.messages.create({
      data: {
        senderId: user.id,

        // text NULL untuk image
        text: null,

        fileUrl: `/uploads/messages/${file.filename}`,
        fileName: file.originalname,
        fileType: file.mimetype,
        fileSize: file.size,
      },
      include: {
        sender: { select: { id: true, username: true, email: true } },
      },
    });

    const normalized = normalize(msg);

    // 🔥 realtime
    req.app.get("io").emit("receive_message", normalized);

    res.json(normalized);
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Server error" });
  }
};
