import { Router } from "express";
import { register, login, getProfile } from "../controllers/auth.controller";
import { authenticateToken } from "../middleware/authenticateToken";

const router = Router();

// REGISTER
router.post("/register", register);

// LOGIN
router.post("/login", login);

// GET USER PROFILE (HANYA JIKA LOGIN)
router.get("/profile", authenticateToken, getProfile);

export default router;
