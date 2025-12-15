import { Request, Response } from "express";
import prisma from "../config/prisma";
import cloudinary from "../config/cloudinary";

// ===============================
// HELPER NORMALIZE (FRONTEND READY)
// ===============================
const normalize = (m: any) => ({
  id: m.id,
  sender: {
    id: m.sender?.id,
    username: m.sender?.username,
    email: m.sender?.email,
  },
  text: m.text || null,

  // 🔥 frontend pakai `image`
  image: m.fileUrl || null,

  createdAt: m.createdAt,
});

// ===============================
// GET ALL MESSAGES
// ===============================
export const getAllMessages = async (_req: Request, res: Response) => {
  try {
    const messages = await prisma.messages.findMany({
      orderBy: { createdAt: "asc" },
      include: {
        sender: {
          select: { id: true, username: true, email: true },
        },
      },
    });

    res.json(messages.map(normalize));
  } catch (error) {
    console.error("GET MESSAGES ERROR:", error);
    res.status(500).json({ message: "Server error" });
  }
};

// ===============================
// SEND TEXT MESSAGE
// ===============================
export const sendTextMessage = async (req: Request, res: Response) => {
  try {
    const user = (req as any).user;

    if (!user) {
      return res.status(401).json({ message: "Unauthorized" });
    }

    const { text } = req.body;

    if (!text || !text.trim()) {
      return res.status(400).json({ message: "Message required" });
    }

    const msg = await prisma.messages.create({
      data: {
        senderId: user.id,
        text: text.trim(),
      },
      include: {
        sender: {
          select: { id: true, username: true, email: true },
        },
      },
    });

    const normalized = normalize(msg);

    // 🔥 realtime
    req.app.get("io").emit("receive_message", normalized);

    res.json(normalized);
  } catch (error) {
    console.error("SEND TEXT ERROR:", error);
    res.status(500).json({ message: "Server error" });
  }
};

// ===============================
// UPLOAD IMAGE MESSAGE (CLOUDINARY)
// ===============================
export const uploadMessageImage = async (req: Request, res: Response) => {
  try {
    const user = (req as any).user;
    const file = req.file;

    if (!user) {
      return res.status(401).json({ message: "Unauthorized" });
    }

    if (!file) {
      return res.status(400).json({ message: "Image required" });
    }

    // 🔥 upload ke Cloudinary
    const uploadResult = await cloudinary.uploader.upload(file.path, {
      folder: "chat-images",
      resource_type: "image",
    });

    const msg = await prisma.messages.create({
      data: {
        senderId: user.id,

        // image message → text NULL
        text: null,

        // 🔥 URL PUBLIC CLOUDINARY
        fileUrl: uploadResult.secure_url,
        fileName: file.originalname,
        fileType: file.mimetype,
        fileSize: file.size,
      },
      include: {
        sender: {
          select: { id: true, username: true, email: true },
        },
      },
    });

    const normalized = normalize(msg);

    // 🔥 realtime ke semua user
    req.app.get("io").emit("receive_message", normalized);

    res.json(normalized);
  } catch (error) {
    console.error("UPLOAD IMAGE ERROR:", error);
    res.status(500).json({ message: "Upload image failed" });
  }
};
