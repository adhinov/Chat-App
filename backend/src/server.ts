// src/server.ts
import express from "express";
import cors from "cors";
import dotenv from "dotenv";
import http from "http";
import { Server as SocketIOServer, Socket } from "socket.io";

import authRoutes from "./routes/auth.routes";
import adminRoutes from "./routes/admin.routes";
import messageRoutes from "./routes/messageRoutes";

dotenv.config();

const app = express();
const server = http.createServer(app);

// ================================
// PARSE CORS MULTI-ORIGIN
// ================================
const allowedOrigins: string[] = process.env.CORS_ORIGIN
  ? process.env.CORS_ORIGIN.split(",").map((s) => s.trim())
  : [];

console.log("Allowed origins:", allowedOrigins);

// ================================
// CORS CONFIG
// ================================
app.use(
  cors({
    origin: (origin, callback) => {
      if (!origin) return callback(null, true);
      if (allowedOrigins.includes(origin)) return callback(null, true);
      return callback(new Error(`CORS blocked for origin: ${origin}`));
    },
    credentials: true,
    methods: ["GET", "POST", "PUT", "PATCH", "DELETE"],
    allowedHeaders: ["Content-Type", "Authorization"],
  })
);

app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// ================================
// SOCKET.IO
// ================================
const io = new SocketIOServer(server, {
  cors: {
    origin: allowedOrigins,
    credentials: true,
  },
});

// 👇 MAP USER ONLINE
const onlineUsers = new Map<string, string>(); 
// key = socket.id, value = userId

io.on("connection", (socket: Socket) => {
  console.log("Socket connected:", socket.id);

  // Frontend akan mengirim userId setelah login
  socket.on("user-online", (userId: string) => {
    onlineUsers.set(socket.id, userId);

    // kirim jumlah user online ke semua client
    io.emit("onlineCount", onlineUsers.size);
  });

  // Chat message
  socket.on("send_message", (data) => {
    io.emit("receive_message", data);
  });

  // Disconnect
  socket.on("disconnect", () => {
    console.log("Socket disconnected:", socket.id);

    // hapus user dari list online
    onlineUsers.delete(socket.id);

    // broadcast jumlah baru
    io.emit("onlineCount", onlineUsers.size);
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

// SAFE 404 HANDLER
app.all(/.*/, (req, res) => {
  res.status(404).json({ message: "Not Found" });
});

// ================================
// START SERVER
// ================================
const PORT = process.env.PORT || 9002;
server.listen(PORT, () =>
  console.log(`Server listening on port ${PORT}`)
);

export default app;
