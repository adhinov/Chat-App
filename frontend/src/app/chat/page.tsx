"use client";

import React, { useEffect, useRef, useState } from "react";
import io, { Socket } from "socket.io-client";
import { useRouter } from "next/navigation";
import {
  DropdownMenu,
  DropdownMenuTrigger,
  DropdownMenuContent,
  DropdownMenuItem,
} from "@/components/ui/dropdown-menu";

// =========================
// TYPE
// =========================
type Message = {
  id?: number;
  sender?: string | { id?: number; username?: string; email?: string };
  text?: string | null;
  fileUrl?: string | null;
  fileType?: string | null;
  fileName?: string | null;
  fileSize?: number | null;
  createdAt?: string;
};

// decode JWT
function decodeToken(token: string | null) {
  if (!token) return null;
  try {
    return JSON.parse(atob(token.split(".")[1]));
  } catch {
    return null;
  }
}

export default function ChatPage() {
  const router = useRouter();

  // =========================
  // STATES
  // =========================
  const [socket, setSocket] = useState<Socket | null>(null);
  const [username, setUsername] = useState<string>("");
  const [onlineCount, setOnlineCount] = useState<number>(1);
  const [text, setText] = useState("");
  const [messages, setMessages] = useState<Message[]>([]);

  const scrollRef = useRef<HTMLDivElement | null>(null);
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  const API_URL =
    typeof window !== "undefined" && process.env.NEXT_PUBLIC_API_URL
      ? process.env.NEXT_PUBLIC_API_URL
      : typeof window !== "undefined"
      ? window.location.origin
      : "http://localhost:9002";

  // =========================
  // INIT SOCKET & FETCH MESSAGES
  // =========================
  useEffect(() => {
    const token = localStorage.getItem("token");
    const payload = decodeToken(token);

    if (!payload) return router.push("/");

    const name =
      payload.username || payload.name || payload.email || "User";
    setUsername(name);

    // connect socket
    const s = io(API_URL, {
      transports: ["websocket"],
      withCredentials: true,
      autoConnect: true,
    });
    setSocket(s);

    s.on("connect", () => {
      const p = decodeToken(localStorage.getItem("token"));
      if (p?.id) s.emit("user-online", p.id);
    });

    // real-time messages listener
    s.on("receive_message", (data: any) => {
      const msg = normalizeMessage(data);
      setMessages((prev) => [...prev, msg]);

      setTimeout(() => scrollRef.current?.scrollIntoView({ behavior: "smooth" }), 10);
    });

    s.on("onlineCount", (count) => setOnlineCount(count));

    fetchMessages();

    return () => {
      s.disconnect();
    };
    // eslint-disable-next-line
  }, []);

  // =========================
  // NORMALIZE MESSAGE SHAPE
  // =========================
  function normalizeMessage(m: any): Message {
    return {
      id: m.id,
      sender:
        typeof m.sender === "object"
          ? m.sender
          : m.sender || m.senderName || m.senderId || null,
      text: m.text ?? m.message ?? null,
      fileUrl: m.fileUrl ?? null,
      fileType: m.fileType ?? null,
      fileName: m.fileName ?? null,
      fileSize: m.fileSize ?? null,
      createdAt: m.createdAt ?? m.created_at ?? new Date().toISOString(),
    };
  }

  // =========================
  // FETCH MESSAGES
  // =========================
  async function fetchMessages() {
    try {
      const token = localStorage.getItem("token");

      const res = await fetch(`${API_URL}/api/messages`, {
        headers: { Authorization: `Bearer ${token}` },
      });

      if (!res.ok) return console.error("Fetch messages failed");

      const data = await res.json();
      const normalized = data.map((m: any) => normalizeMessage(m));

      setMessages(normalized);

      setTimeout(() => scrollRef.current?.scrollIntoView({ behavior: "smooth" }), 70);
    } catch (err) {
      console.error(err);
    }
  }

  // =========================
  // SEND MESSAGE (NO DOUBLE BUBBLE)
  // =========================
  async function handleSend() {
    if (!text.trim()) return;

    const token = localStorage.getItem("token");
    try {
      const res = await fetch(`${API_URL}/api/messages`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ text }),
      });

      if (!res.ok) return;

      const saved = await res.json();
      const msg = normalizeMessage(saved);

      // realtime only → avoid double push
      socket?.emit("send_message", msg);

      setText("");
    } catch {}
  }

  // =========================
  // FILE UPLOAD
  // =========================
  async function handleFileUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;

    const token = localStorage.getItem("token");
    const form = new FormData();
    form.append("file", file);

    try {
      const res = await fetch(`${API_URL}/api/messages/upload`, {
        method: "POST",
        headers: { Authorization: `Bearer ${token}` },
        body: form,
      });

      const saved = await res.json();
      const msg = normalizeMessage(saved);

      socket?.emit("send_message", msg);

      if (fileInputRef.current) fileInputRef.current.value = "";
    } catch {}
  }

  // =========================
  // GET SENDER NAME
  // =========================
  function getSenderName(s: any) {
    if (!s) return "Unknown";
    if (typeof s === "string") return s;
    return s.username || s.email || `User#${s.id}`;
  }

  // =========================
  // RENDER UI
  // =========================
  return (
    <div className="h-[100dvh] w-full bg-[#0f1724] text-white flex flex-col overflow-hidden">

      {/* CHAT WRAPPER */}
      <div className="flex flex-col w-full h-full sm:max-w-xl sm:mx-auto sm:mt-3 sm:h-[93vh]
                      bg-[#101827] sm:rounded-xl shadow-xl overflow-hidden">

        {/* HEADER */}
        <div className="flex items-center justify-between p-4 border-b border-[#1f2937] bg-[#101827] sticky top-0 z-20">
          <div className="flex items-center gap-3">
            <div className="h-10 w-10 rounded-full bg-green-500 flex items-center justify-center font-bold">
              {username[0]?.toUpperCase()}
            </div>
            <div>
              <div className="font-semibold">{username}</div>
              <div className="text-xs text-gray-300">
                Online • {onlineCount} User{onlineCount > 1 ? "s" : ""}
              </div>
            </div>
          </div>

          <DropdownMenu>
            <DropdownMenuTrigger className="text-xl px-3 py-1 rounded hover:bg-[#1f2937]">
              ⚙
            </DropdownMenuTrigger>
            <DropdownMenuContent className="bg-[#0f1724] text-white border border-[#23303b]">
              <DropdownMenuItem onClick={() => router.push("/profile")}>
                Profile
              </DropdownMenuItem>
              <DropdownMenuItem
                onClick={() => {
                  localStorage.removeItem("token");
                  router.push("/");
                }}
                className="hover:bg-red-600"
              >
                Logout
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>

        {/* MESSAGE LIST */}
        <div className="flex-1 overflow-y-auto px-3 py-3">
          <div className="space-y-3">
            {messages.map((m) => {
              const isMe = (() => {
                const p = decodeToken(localStorage.getItem("token"));
                const myName = p?.username || p?.email;
                if (typeof m.sender === "string") return m.sender === myName;
                return m.sender?.username === myName || m.sender?.email === myName;
              })();

              return (
                <div key={m.id ?? Math.random()} className={`flex ${isMe ? "justify-end" : "justify-start"}`}>
                  <div
                    className={`px-4 py-2 rounded-xl max-w-[80%] ${
                      isMe ? "bg-[#2a4365]" : "bg-[#1f2937]"
                    }`}
                  >
                    <div className="text-xs text-gray-300">
                      {isMe ? "You" : getSenderName(m.sender)}
                    </div>

                    {m.fileUrl ? (
                      m.fileType?.startsWith("image/") ? (
                        <img
                          src={`${API_URL}${m.fileUrl}`}
                          className="mt-1 rounded-lg max-w-[180px] border border-white/10"
                        />
                      ) : (
                        <a
                          href={`${API_URL}${m.fileUrl}`}
                          target="_blank"
                          className="underline text-sm"
                        >
                          {m.fileName ?? "Download File"}
                        </a>
                      )
                    ) : (
                      <div className="mt-1 text-sm">{m.text}</div>
                    )}

                    <div className="text-[10px] text-gray-500 mt-1">
                      {new Date(m.createdAt ?? "").toLocaleTimeString([], {
                        hour: "2-digit",
                        minute: "2-digit",
                      })}
                    </div>
                  </div>
                </div>
              );
            })}
            <div ref={scrollRef} />
          </div>
        </div>

        {/* INPUT BAR */}
        <div className="w-full px-3 py-3 bg-[#0a0f24] border-t border-white/5 flex items-center gap-3">
          <input type="file" ref={fileInputRef} className="hidden" onChange={handleFileUpload} />

          <div className="flex items-center bg-[#11172c] rounded-full px-3 flex-1 h-12">
            <button
              onClick={() => fileInputRef.current?.click()}
              className="text-white/70 hover:text-white mr-2"
            >
              +
            </button>

            <input
              type="text"
              value={text}
              onChange={(e) => setText(e.target.value)}
              placeholder="Type a message..."
              className="flex-1 bg-transparent text-white px-2 outline-none text-[15px]"
              onKeyDown={(e) => e.key === "Enter" && handleSend()}
            />
          </div>

          <button
            onClick={handleSend}
            className="h-12 w-12 flex items-center justify-center rounded-full bg-[#ff6b35] hover:bg-[#e85b2b]"
          >
            ➤
          </button>
        </div>
      </div>
    </div>
  );
}
