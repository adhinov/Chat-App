import dotenv from "dotenv";
dotenv.config();

import express from "express";
import cors from "cors";
import http from "http";
import path from "path";
import jwt from "jsonwebtoken";
import { Server as SocketIOServer, Socket } from "socket.io";

import authRoutes from "./routes/auth.routes";
import adminRoutes from "./routes/admin.routes";
import messageRoutes from "./routes/messageRoutes";

// ================================
// TYPES
// ================================
interface JwtUserPayload extends jwt.JwtPayload {
  id: number;
  username: string;
  email: string;
  role: string;
}

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

// serve uploads
app.use(
  "/uploads/messages",
  express.static(path.join(__dirname, "../uploads/messages"))
);

// ================================
// SOCKET.IO
// ================================
const io = new SocketIOServer(server, {
  cors: {
    origin: allowedOrigins,
    credentials: true,
  },
});

app.set("io", io);

// ================================
// ONLINE USERS
// ================================
type OnlineUser = {
  id: number;
  username: string;
  email: string;
};

const onlineUsers = new Map<string, OnlineUser>();

// ================================
// SOCKET AUTH
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

  console.log("🟢 Connected:", user.username);

  onlineUsers.set(socket.id, user);
  io.emit("onlineCount", onlineUsers.size);

  // SEND MESSAGE
  socket.on("send-message", ({ text }) => {
      if (!text?.trim()) return;

      const message = {
        id: Date.now(),
        text,
        createdAt: new Date().toISOString(),
        sender: {
          id: user.id,
          username: user.username,
          email: user.email,
        },
      };

      io.emit("receive-message", message);
    });

  socket.on("disconnect", () => {
    console.log("🔴 Disconnected:", user.username);
    onlineUsers.delete(socket.id);
    io.emit("onlineCount", onlineUsers.size);
  });
});

// ================================
// ROUTES
// ================================
app.use("/api/auth", authRoutes);
app.use("/api/admin", adminRoutes);
app.use("/api/messages", messageRoutes);

// ROOT
app.get("/", (_req, res) => {
  res.json({ message: "Backend Chat-App running..." });
});

// ================================
// START SERVER
// ================================
const PORT = process.env.PORT || 9002;
server.listen(PORT, () =>
  console.log(`🚀 Server running on port ${PORT}`)
);

export default app;
