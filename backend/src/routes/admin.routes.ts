import express from "express";
import { AdminService } from "../services/admin.service";
import { authenticateToken } from "../middleware/auth";
import { authorizeAdmin } from "../middleware/admin";

const router = express.Router();

// ===============================
// GET ALL USERS (ADMIN ONLY)
// ===============================
router.get(
  "/users",
  authenticateToken,
  authorizeAdmin,
  async (req: any, res) => {
    try {
      // LOGGING FOR DEBUG
      console.log("=== ADMIN ROUTE HIT ===");
      console.log("BACKEND TOKEN PAYLOAD:", req.user);

      const users = await AdminService.getAllUsers();

      return res.json({ users });
    } catch (error: any) {
      console.error("ADMIN GET USERS ERROR:", error.message);
      return res.status(500).json({ error: "Failed to fetch users" });
    }
  }
);

export default router;
