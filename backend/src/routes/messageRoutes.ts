import { Router } from "express";
import { authenticateToken } from "../middleware/authenticateToken";
import upload from "../middleware/uploadMessage";
import {
  getAllMessages,
  sendTextMessage,
  uploadMessageImage,
} from "../controllers/messageController";

const router = Router();

router.get("/", authenticateToken, getAllMessages);
router.post("/", authenticateToken, sendTextMessage);
router.post(
  "/upload",
  authenticateToken,
  upload.single("image"),
  uploadMessageImage
);

export default router;
