import { Router } from "express";
import { authenticateToken } from "../middleware/authenticateToken";
import {
  getAllMessages,
  sendTextMessage,
  uploadMessageFile,
} from "../controllers/messageController";

import { upload } from "../config/multer";

const router = Router();

// ===============================
// GET ALL MESSAGES
// ===============================
router.get("/", authenticateToken, getAllMessages);

// ===============================
// SEND TEXT MESSAGE
// ===============================
router.post("/", authenticateToken, sendTextMessage);

// ===============================
// UPLOAD FILE MESSAGE
// ===============================
router.post(
  "/upload",
  authenticateToken,
  upload.single("file"),
  uploadMessageFile
);

export default router;
