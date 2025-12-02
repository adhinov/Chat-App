import express from "express";
import cors from "cors";
import dotenv from "dotenv";
import { connectDB, prisma } from "./config/database";
import bcrypt from "bcryptjs";

dotenv.config();

const app = express();
const port = process.env.PORT || 9002;

// ========================================
// CORS PALING SIMPLE & STABIL
// ========================================
app.use(
  cors({
    origin: "https://chat-app-five-xi-63.vercel.app", // frontend
    credentials: true,
    methods: ["GET", "POST", "PUT", "DELETE", "PATCH"],
    allowedHeaders: ["Content-Type", "Authorization"],
  })
);

// FIX KOMPATIBILITAS EXPRESS 5 → gunakan "/*" bukan "*"
app.options("/*", cors());

// ========================================
app.use(express.json());

// ====== CONNECT DATABASE ======
connectDB();

// ====== AUTO CREATE ADMIN ======
async function ensureAdminUser() {
  try {
    const adminEmail = "admin@example.com";

    const existingAdmin = await prisma.user.findUnique({
      where: { email: adminEmail },
    });

    if (!existingAdmin) {
      const hashedPassword = await bcrypt.hash("admin123", 10);

      await prisma.user.create({
        data: {
          username: "admin",
          email: adminEmail,
          phone: "0",
          password: hashedPassword,
          role: "ADMIN",
        },
      });

      console.log("✓ Default admin created!");
    } else {
      console.log("✓ Admin already exists.");
    }
  } catch (error) {
    console.error("Failed to ensure admin user:", error);
  }
}

ensureAdminUser();

// ====== ROUTES ======
import authRoutes from "./routes/auth.routes";
import adminRoutes from "./routes/admin.routes";

app.use("/api/auth", authRoutes);
app.use("/api/admin", adminRoutes);

// ====== ROOT ROUTE ======
app.get("/", (req, res) => {
  res.json({ message: "Welcome to Chat App API" });
});

// ====== START SERVER ======
app.listen(port, () => {
  console.log(`Server is running on port ${port}`);
});
