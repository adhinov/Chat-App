import { Request, Response } from "express";
import prisma from "../config/prisma";

// ===============================
// Helper: normalize message
// ===============================
function normalize(m: any) {
  return {
    id: m.id,
    sender: {
      id: m.sender?.id,
      username: m.sender?.username,
      email: m.sender?.email,
    },
    text: m.text || null,
    fileUrl: m.fileUrl || null,
    fileName: m.fileName || null,
    fileType: m.fileType || null,
    fileSize: m.fileSize || null,
    createdAt: m.createdAt,
  };
}

// ===============================
// GET ALL MESSAGES
// ===============================
export const getAllMessages = async (req: Request, res: Response): Promise<void> => {
  try {
    const msgs = await prisma.messages.findMany({
      orderBy: { createdAt: "asc" },
      include: {
        sender: { select: { id: true, username: true, email: true } },
      },
    });

    const normalized = msgs.map((m) => normalize(m));
    res.json(normalized);
  } catch (error) {
    console.error("GET messages error:", error);
    res.status(500).json({ error: "Server error" });
  }
};

// ===============================
// SEND TEXT MESSAGE
// ===============================
export const sendTextMessage = async (req: Request, res: Response): Promise<void> => {
  try {
    const user = req.user;
    const { text } = req.body;

    if (!text || text.trim() === "") {
      res.status(400).json({ error: "Text message required" });
      return;
    }

    const newMsg = await prisma.messages.create({
      data: {
        senderId: user.id,
        text: text.trim(),
      },
      include: {
        sender: { select: { id: true, username: true, email: true } },
      },
    });

    const normalized = normalize(newMsg);

    const io = req.app.get("io");
    io.emit("receive_message", normalized);

    res.json(normalized);
  } catch (error) {
    console.error("POST text message error:", error);
    res.status(500).json({ error: "Server error" });
  }
};

// ===============================
// UPLOAD FILE MESSAGE
// ===============================
export const uploadMessageFile = async (req: Request, res: Response): Promise<void> => {
  try {
    const user = req.user;
    const file = req.file;

    if (!file) {
      res.status(400).json({ error: "File required" });
      return;
    }

    const newMsg = await prisma.messages.create({
      data: {
        senderId: user.id,
        fileUrl: "/uploads/messages/" + file.filename,
        fileName: file.originalname,
        fileType: file.mimetype,
        fileSize: file.size,
      },
      include: {
        sender: { select: { id: true, username: true, email: true } },
      },
    });

    const normalized = normalize(newMsg);

    const io = req.app.get("io");
    io.emit("receive_message", normalized);

    res.json(normalized);
  } catch (error) {
    console.error("UPLOAD file message error:", error);
    res.status(500).json({ error: "Server error" });
  }
};
