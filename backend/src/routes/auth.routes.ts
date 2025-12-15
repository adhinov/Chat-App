import { Router } from "express";
import { register, login, getProfile } from "../controllers/auth.controller";
import { authenticateToken } from "../middleware/authenticateToken";

const router = Router();

router.post("/signup", register); // atau /register
router.post("/login", login);

// ❌ JANGAN casting AuthRequest di sini
router.get("/profile", authenticateToken, getProfile);

export default router;
