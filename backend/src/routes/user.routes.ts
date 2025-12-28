import { Router } from "express";
import { authenticateToken } from "../middleware/authenticateToken";
import { uploadAvatar } from "../middleware/uploadAvatar";
import { updateAvatar, updateProfile } from "../controllers/user.controller";

const router = Router();

router.post(
  "/avatar",
  authenticateToken,
  uploadAvatar,
  updateAvatar
);

router.put(
  "/profile",
  authenticateToken,
  updateProfile
);

export default router;
