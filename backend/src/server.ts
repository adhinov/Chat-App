import express from "express";
import cors from "cors";
import dotenv from "dotenv";
import http from "http";
import path from "path";
import jwt from "jsonwebtoken";
import { Server as SocketIOServer, Socket } from "socket.io";

import authRoutes from "./routes/auth.routes";
import adminRoutes from "./routes/admin.routes";
import messageRoutes from "./routes/messageRoutes";

interface JwtUserPayload extends jwt.JwtPayload {
  id: number;
  username: string;
  email: string;
  role: string;
}

dotenv.config();

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

// GLOBAL ONLINE USERS LIST
// socket.id → { userId, username, email }
const onlineUsers = new Map<
  string,
  { userId: number; username: string; email: string }
>();

io.use((socket, next) => {
  try {
    const token = socket.handshake.auth?.token;
    if (!token) return next(new Error("NO_TOKEN"));

    const decoded = jwt.verify(token, process.env.JWT_SECRET!) as JwtUserPayload;

    // simpan data user ke socket
    socket.data.user = {
      userId: decoded.id,
      username: decoded.username,
      email: decoded.email,
      role: decoded.role,
    };

    next();
  } catch (err) {
    next(new Error("INVALID_TOKEN"));
  }
});

io.on("connection", (socket: Socket) => {
  const user = socket.data.user;

  console.log("User connected:", user.username);

  onlineUsers.set(socket.id, {
    userId: user.userId,
    username: user.username,
    email: user.email,
  });

  // Broadcast daftar online user ke semua client
  io.emit("onlineUsers", Array.from(onlineUsers.values()));

  // Saat kirim pesan
  socket.on("send_message", (text: string) => {
    const messageData = {
      userId: user.userId,
      username: user.username,
      message: text,
      createdAt: new Date().toISOString(),
    };

    io.emit("receive_message", messageData);
  });

  // disconnect
  socket.on("disconnect", () => {
    console.log("User disconnected:", user.username);
    onlineUsers.delete(socket.id);
    io.emit("onlineUsers", Array.from(onlineUsers.values()));
  });
});

// ================================
// ROUTES
// ================================
app.use("/api/auth", authRoutes);
app.use("/api/admin", adminRoutes);
app.use("/api/messages", messageRoutes);

app.get("/", (req, res) => {
  res.json({ message: "Backend Chat-App running..." });
});

const PORT = process.env.PORT || 9002;
server.listen(PORT, () => console.log(`Server running on port ${PORT}`));

export default app;
