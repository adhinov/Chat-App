import express from "express";
import { verifyToken } from "../middleware/verifyToken";
import {
  uploadMessageFile,
  getAllMessages,
  sendTextMessage
} from "../controllers/messageController";

import { upload } from "../config/multer";   // ✅ WAJIB DARI MULTER CONFIG

const router = express.Router();

// GET : ambil semua history chat
router.get("/", verifyToken, getAllMessages);

// POST : kirim pesan text
router.post("/", verifyToken, sendTextMessage);

// POST : upload file (gambar/pdf/dll)
router.post(
  "/upload",
  verifyToken,
  upload.single("file"),   // ✔️ ini dari config multer
  uploadMessageFile
);

export default router;
