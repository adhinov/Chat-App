import express from "express";
import { AuthService } from "../services/auth.service";
import { authenticateToken } from "../middleware/auth";

const router = express.Router();

/**
 * ================================
 *  REGISTER USER
 * ================================
 * POST /api/auth/register
 */
router.post("/signup", async (req, res) => {
  try {
    const { username, phone, email, password } = req.body;

    if (!username || !phone || !email || !password) {
      return res.status(400).json({ error: "All fields are required" });
    }

    const result = await AuthService.signup(username, phone, email, password);

    return res.json(result);
  } catch (error: any) {
    return res.status(400).json({ error: error.message });
  }
});

/**
 * ================================
 *  LOGIN (email atau phone)
 * ================================
 * POST /api/auth/login
 */
router.post("/login", async (req, res) => {
  try {
    const { identifier, password } = req.body;

    if (!identifier || !password) {
      return res.status(400).json({ error: "Identifier & password required" });
    }

    const result = await AuthService.login(identifier, password);

    return res.json(result);
  } catch (error: any) {
    return res.status(401).json({ error: error.message });
  }
});

/**
 * ================================
 *  CHECK TOKEN / CURRENT USER
 * ================================
 * GET /api/auth/me
 */
router.get("/me", authenticateToken, async (req: any, res) => {
  if (!req.user) return res.status(401).json({ error: "Unauthorized" });

  return res.json({ user: req.user });
});

export default router;
