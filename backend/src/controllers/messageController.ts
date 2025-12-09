import { Request, Response } from "express";
import prisma from "../config/prisma";

// ===============================
// GET ALL MESSAGES
// ===============================
export const getAllMessages = async (req: Request, res: Response): Promise<void> => {
  try {
    const msgs = await prisma.messages.findMany({
      orderBy: { createdAt: "asc" },
      include: {
        sender: {
          select: { id: true, username: true, email: true }
        }
      }
    });

    res.json(msgs);
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
    const userId = req.user.id; // dari verifyToken
    const { text } = req.body;

    if (!text) {
      res.status(400).json({ error: "Text message required" });
      return;
    }

    const newMsg = await prisma.messages.create({
      data: {
        senderId: userId,
        text: text
      }
    });

    res.json(newMsg);
  } catch (error) {
    console.error("POST message error:", error);
    res.status(500).json({ error: "Server error" });
  }
};

// ===============================
// UPLOAD FILE MESSAGE
// ===============================
export const uploadMessageFile = async (req: Request, res: Response): Promise<void> => {
  try {
    const userId = req.user.id;
    const file = req.file;

    if (!file) {
      res.status(400).json({ error: "file required" });
      return;
    }

    const newMsg = await prisma.messages.create({
      data: {
        senderId: userId,
        fileUrl: "/uploads/messages/" + file.filename,
        fileName: file.originalname,
        fileType: file.mimetype,
        fileSize: file.size
      }
    });

    res.json(newMsg);
  } catch (error) {
    console.error("UPLOAD file message error:", error);
    res.status(500).json({ error: "Server error" });
  }
};
