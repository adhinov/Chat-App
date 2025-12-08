// src/routes/messageRoutes.ts
import express, { Request, Response } from "express";
import prisma from "../config/prisma";

const router = express.Router();

// GET /api/messages
router.get("/", async (req: Request, res: Response) => {
  try {
    const messages = await prisma.messages.findMany({
      orderBy: { created_at: "asc" },
    });

    res.json(messages);
  } catch (error) {
    console.error("GET messages error:", error);
    res.status(500).json({ error: "Server error" });
  }
});

// POST /api/messages
router.post("/", async (req: Request, res: Response) => {
  try {
    const { sender, message } = req.body;

    if (!sender || !message) {
      return res.status(400).json({ error: "sender & message required" });
    }

    const newMessage = await prisma.messages.create({
      data: {
        sender,
        message,
      },
    });

    res.json(newMessage);
  } catch (error) {
    console.error("POST message error:", error);
    res.status(500).json({ error: "Server error" });
  }
});

export default router;
