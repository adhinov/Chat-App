import { Router } from "express";
import { authenticateToken } from "../middleware/authenticateToken";
import { uploadAvatar } from "../middleware/uploadAvatar";
import { updateAvatar } from "../controllers/user.controller";

const router = Router();

router.post(
  "/avatar",
  authenticateToken,
  uploadAvatar,
  updateAvatar
);

export default router;
