import dotenv from "dotenv";
dotenv.config();

import express from "express";
import cors from "cors";
import http from "http";
import jwt from "jsonwebtoken";
import { Server as SocketIOServer, Socket } from "socket.io";
import userRoutes from "./routes/user.routes";
import authRoutes from "./routes/auth.routes";
import adminRoutes from "./routes/admin.routes";
import messageRoutes from "./routes/messageRoutes";

// 🔥 NEON DATABASE CONNECTION
import { checkDatabaseConnection } from "./lib/db-utils";
import { startNeonKeepalive } from "./middleware/neon-connection.middleware";

// ================================
// TYPES
// ================================
interface JwtUserPayload extends jwt.JwtPayload {
  id: number;
  username: string;
  email: string;
  role: string;
}

type OnlineUser = {
  id: number;
  username: string;
  email: string;
};

// ================================
// APP INIT
// ================================
const app = express();
const server = http.createServer(app);

// ================================
// CORS
// ================================
const allowedOrigins: string[] = process.env.CORS_ORIGIN
  ? process.env.CORS_ORIGIN.split(",").map((s) => s.trim())
  : [];

app.use(
  cors({
    origin: allowedOrigins,
    credentials: true,
  })
);

app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// ================================
// SOCKET.IO INIT
// ================================
const io = new SocketIOServer(server, {
  cors: {
    origin: allowedOrigins,
    credentials: true,
  },
});

// supaya controller bisa emit
app.set("io", io);

// ================================
// ONLINE USERS
// ================================
const onlineUsers = new Map<number, OnlineUser>();

// ================================
// SOCKET AUTH (JWT)
// ================================
io.use((socket: Socket, next) => {
  try {
    const token = socket.handshake.auth?.token;
    if (!token) return next(new Error("NO_TOKEN"));

    const decoded = jwt.verify(
      token,
      process.env.JWT_SECRET!
    ) as JwtUserPayload;

    socket.data.user = {
      id: decoded.id,
      username: decoded.username,
      email: decoded.email,
    };

    next();
  } catch {
    next(new Error("INVALID_TOKEN"));
  }
});

// ================================
// SOCKET EVENTS
// ================================
io.on("connection", (socket: Socket) => {
  const user = socket.data.user as OnlineUser;

  console.log("🟢 Connected:", user.username, `(id=${user.id})`);

  onlineUsers.set(user.id, user);
  io.emit("onlineCount", onlineUsers.size);

  socket.on("disconnect", () => {
    console.log("🔴 Disconnected:", user.username);

    onlineUsers.delete(user.id);
    io.emit("onlineCount", onlineUsers.size);
  });
});

// ================================
// ROUTES
// ================================
app.use("/api/auth", authRoutes);
app.use("/api/admin", adminRoutes);
app.use("/api/messages", messageRoutes);
app.use("/api/users", userRoutes);

// ROOT
app.get("/", (_req, res) => {
  res.json({ message: "Backend Chat-App running..." });
});

// ================================
// NEON DATABASE INITIALIZATION
// ================================
async function initializeDatabase() {
  console.log("🔌 Connecting to Neon database...");
  
  try {
    const isConnected = await checkDatabaseConnection();
    
    if (isConnected) {
      console.log("✅ Neon database connected successfully!");
      
      // 🏓 Optional: Start keepalive to prevent auto-suspend
      // Uncomment the line below if you want to keep Neon awake
      // startNeonKeepalive(4 * 60 * 1000); // Ping every 4 minutes
      
      return true;
    } else {
      console.error("❌ Failed to connect to Neon database");
      return false;
    }
  } catch (error) {
    console.error("❌ Database initialization error:", error);
    return false;
  }
}

// ================================
// START SERVER
// ================================
const PORT = process.env.PORT || 9002;

async function startServer() {
  // Initialize Neon database connection first
  const dbConnected = await initializeDatabase();
  
  if (!dbConnected) {
    console.error("⚠️  Starting server without database connection");
    console.error("⚠️  Some features may not work properly");
  }
  
  server.listen(PORT, () => {
    console.log(`🚀 Server running on port ${PORT}`);
    console.log(`📊 Environment: ${process.env.NODE_ENV || "development"}`);
    console.log(`🌐 CORS Origins: ${allowedOrigins.join(", ") || "Not configured"}`);
  });
}

// Start the server
startServer().catch((error) => {
  console.error("❌ Failed to start server:", error);
  process.exit(1);
});

export default app;
