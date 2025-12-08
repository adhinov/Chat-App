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

// ================== TYPES ==================
type Message = {
  id?: number;
  sender: string;
  message: string;
  createdAt: string;
};

// ================== JWT DECODE ==================
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

  const [socket, setSocket] = useState<Socket | null>(null);
  const [username, setUsername] = useState<string>("");

  const [message, setMessage] = useState("");
  const [messages, setMessages] = useState<Message[]>([]);

  const scrollRef = useRef<HTMLDivElement | null>(null);
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  // ================== API URL ==================
  const API_URL =
    typeof window !== "undefined" && process.env.NEXT_PUBLIC_API_URL
      ? process.env.NEXT_PUBLIC_API_URL
      : typeof window !== "undefined"
      ? window.location.origin
      : "http://localhost:9002";

  // ================== LOAD USER + INIT SOCKET ==================
  useEffect(() => {
    const token = localStorage.getItem("token");
    const payload = decodeToken(token);

    if (!payload) return router.push("/");

    const name = payload.username || payload.name || payload.email || "User";
    setUsername(name);

    // Socket connect
    const s = io(API_URL, {
      transports: ["websocket"],
      withCredentials: true,
    });

    setSocket(s);

    // REALTIME LISTENER
    s.on("receive_message", (data: Message) => {
      setMessages((prev) => [...prev, data]);

      setTimeout(() => {
        scrollRef.current?.scrollIntoView({ behavior: "smooth" });
      }, 30);
    });

    // Load pesan awal
    fetchMessages();

    return () => {
      s.disconnect();
    };
  }, []);

  // ================== FETCH MESSAGES ==================
  async function fetchMessages() {
    try {
      const res = await fetch(`${API_URL}/api/messages`);
      const data = await res.json();

      // NORMALISASI FIELD dari DB → frontend
      const normalized = data.map((m: any) => ({
        id: m.id,
        sender: m.sender,
        message: m.message,
        createdAt: m.created_at || m.createdAt,
      }));

      setMessages(normalized);

      setTimeout(() => {
        scrollRef.current?.scrollIntoView({ behavior: "smooth" });
      }, 50);
    } catch (err) {
      console.error("Fetch messages error:", err);
    }
  }

  // ================== SEND MESSAGE ==================
  async function handleSend() {
    if (!message.trim() || !socket) return;

    const token = localStorage.getItem("token");
    if (!token) return router.push("/");

    try {
      // Save to DB
      const res = await fetch(`${API_URL}/api/messages`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          sender: username,
          message,
        }),
      });

      const savedMessage = await res.json();

      // Normalize created_at → createdAt
      const finalMessage: Message = {
        ...savedMessage,
        createdAt: savedMessage.created_at,
      };

      // Emit realtime
      socket.emit("send_message", finalMessage);

      // Clear input
      setMessage("");
    } catch (err) {
      console.error("Send message error:", err);
    }
  }

  // ================== LOGOUT ==================
  function handleLogout() {
    localStorage.removeItem("token");
    router.push("/");
  }

  // ================== FILE UPLOAD (BELUM DIPAKAI) ==================
  function handleFileUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    console.log("Selected file:", file);
  }

  // ================== RENDER UI ==================
  return (
    <div className="h-[100dvh] w-full bg-[#0f1724] text-white flex flex-col overflow-hidden">
      <div className="flex flex-col w-full h-full sm:max-w-xl sm:mx-auto sm:h-[92vh] sm:mt-4 
                      bg-[#101827] sm:rounded-xl border border-[#1f2937] shadow-xl overflow-hidden">

        {/* HEADER */}
        <div className="flex items-center justify-between p-4 border-b border-[#1f2937] bg-[#101827]">
          <div className="flex items-center gap-3">
            <div className="h-10 w-10 rounded-full bg-green-500 flex items-center justify-center font-bold">
              {username?.[0]?.toUpperCase()}
            </div>
            <div>
              <div className="font-semibold">{username}</div>
              <div className="text-xs text-gray-300">Online •</div>
            </div>
          </div>

          <DropdownMenu>
            <DropdownMenuTrigger className="text-xl px-3 py-1 rounded hover:bg-[#1f2937]">
              ⚙
            </DropdownMenuTrigger>
            <DropdownMenuContent className="bg-[#0f1724] text-white border border-[#23303b]">
              <DropdownMenuItem
                className="hover:bg-[#1f2937]"
                onClick={() => router.push("/profile")}
              >
                Profile
              </DropdownMenuItem>

              <DropdownMenuItem
                className="hover:bg-red-600"
                onClick={handleLogout}
              >
                Logout
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>

        {/* MESSAGES */}
        <div className="flex-1 overflow-y-auto px-3 py-3">
          <div className="space-y-3">
            {messages.map((m) => (
              <div
                key={m.id}
                className={`flex ${m.sender === username ? "justify-end" : "justify-start"}`}
              >
                <div
                  className={`px-4 py-2 rounded-xl max-w-[80%] break-words ${
                    m.sender === username
                      ? "bg-[#2a4365]"
                      : "bg-[#1f2937]"
                  }`}
                >
                  <div className="text-xs text-gray-300">
                    {m.sender === username ? "You" : m.sender}
                  </div>

                  <div className="mt-1 text-sm">{m.message}</div>

                  <div className="mt-1 text-[10px] text-gray-500">
                    {new Date(m.createdAt).toLocaleTimeString([], {
                      hour: "2-digit",
                      minute: "2-digit",
                    })}
                  </div>
                </div>
              </div>
            ))}
            <div ref={scrollRef} />
          </div>
        </div>

        {/* INPUT */}
        <div className="w-full px-3 py-3 bg-[#0a0f24] border-t border-white/5 flex items-center gap-3">

          <input
            type="file"
            ref={fileInputRef}
            className="hidden"
            onChange={handleFileUpload}
          />

          <div className="flex items-center bg-[#11172c] rounded-full px-3 flex-1 h-12">
            <button
              onClick={() => fileInputRef.current?.click()}
              className="text-white/70 hover:text-white mr-2"
            >
              +
            </button>

            <input
              type="text"
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              placeholder="Type your message..."
              className="flex-1 bg-transparent text-white px-2 outline-none text-[15px] placeholder-white/40"
              onKeyDown={(e) => e.key === "Enter" && handleSend()}
            />
          </div>

          <button
            onClick={handleSend}
            className="h-12 w-12 flex items-center justify-center rounded-full bg-[#ff6b35] hover:bg-[#e85b2b] text-white active:scale-95 transition"
          >
            <svg
              xmlns="http://www.w3.org/2000/svg"
              width="22"
              height="22"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              viewBox="0 0 24 24"
            >
              <path d="M22 2 11 13"></path>
              <path d="M22 2 15 22 11 13 2 9 22 2z"></path>
            </svg>
          </button>
        </div>

      </div>
    </div>
  );
}
