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

type Message = {
  id?: string;
  sender: string;
  message: string;
  createdAt: string;
};

function decodeToken(token: string | null) {
  if (!token) return null;
  try {
    const payload = JSON.parse(atob(token.split(".")[1]));
    return payload;
  } catch (e) {
    return null;
  }
}

export default function ChatPage() {
  const router = useRouter();
  const [socket, setSocket] = useState<Socket | null>(null);
  const [connected, setConnected] = useState(false);
  const [username, setUsername] = useState<string>("");

  const [input, setInput] = useState("");
  const [messages, setMessages] = useState<Message[]>([]);

  const scrollRef = useRef<HTMLDivElement | null>(null);

  const API_URL =
    typeof window !== "undefined" && process.env.NEXT_PUBLIC_API_URL
      ? process.env.NEXT_PUBLIC_API_URL
      : typeof window !== "undefined"
      ? window.location.origin
      : "http://localhost:9002";

  useEffect(() => {
    const token = typeof window !== "undefined" ? localStorage.getItem("token") : null;
    const payload = decodeToken(token);
    if (!payload) {
      router.push("/");
      return;
    }

    const name = payload.username || payload.name || payload.email || "User";
    setUsername(name);

    const s = io(API_URL, {
      path: "/socket.io",
      transports: ["websocket"],
      withCredentials: true,
    });

    setSocket(s);

    s.on("connect", () => {
      setConnected(true);

      // Join announcement
      s.emit("send_message", {
        sender: "System",
        message: `${name} joined the chat`,
        createdAt: new Date().toISOString(),
      });
    });

    s.on("receive_message", (data: Message) => {
      setMessages((prev) => [...prev, data]);
      setTimeout(() => scrollRef.current?.scrollIntoView({ behavior: "smooth" }), 30);
    });

    s.on("disconnect", () => setConnected(false));

    // welcome message
    setMessages([
      {
        sender: "System",
        message: `Hello ${name}! Welcome to the chat room.`,
        createdAt: new Date().toISOString(),
      },
    ]);

    return () => {
      s.disconnect();
    };
  }, []);

  function handleSend() {
    if (!input.trim() || !socket) return;

    const msg: Message = {
      sender: username,
      message: input.trim(),
      createdAt: new Date().toISOString(),
    };

    // Only send to server, do not optimistically render (to prevent duplicates)
    socket.emit("send_message", msg);

    setInput("");
  }

  function handleLogout() {
    localStorage.removeItem("token");
    router.push("/");
  }

  return (
    <div className="min-h-screen bg-[#0f1724] text-white flex items-center justify-center p-4">
      <div className="w-full max-w-4xl bg-[#101827] rounded-xl shadow-xl flex flex-col h-[85vh]">

        {/* Chat Header (inside card) */}
        <div className="flex items-center justify-between p-4 border-b border-[#1f2937]">
          <div className="flex items-center gap-3">
            <div className="h-10 w-10 rounded-full bg-green-500 flex items-center justify-center font-bold">
              {username?.[0]?.toUpperCase() || "U"}
            </div>
            <div>
              <div className="font-semibold">{username}</div>
              <div className="text-xs text-gray-300">Online •</div>
            </div>
          </div>

          {/* Dropdown Menu */}
          <DropdownMenu>
            <DropdownMenuTrigger className="text-xl px-3 py-1 rounded hover:bg-[#1f2937]">
              ⚙
            </DropdownMenuTrigger>
            <DropdownMenuContent className="bg-[#0f1724] text-white border border-[#23303b]">
              <DropdownMenuItem
                className="hover:bg-[#1f2937] cursor-pointer"
                onClick={() => router.push("/profile")}
              >
                Profile
              </DropdownMenuItem>
              <DropdownMenuItem
                className="hover:bg-red-600 cursor-pointer"
                onClick={handleLogout}
              >
                Logout
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>

        {/* Chat Messages */}
        <div className="flex-1 p-4 overflow-y-auto">
          <div className="space-y-3">
            {messages.map((m, idx) => (
              <div key={idx} className={`flex ${m.sender === username ? "justify-end" : "justify-start"}`}>
                <div
                  className={`max-w-[70%] px-4 py-2 rounded-lg ${
                    m.sender === username
                      ? "bg-[#2a4365] text-white"
                      : m.sender === "System"
                      ? "bg-[#374151] text-gray-200"
                      : "bg-[#1f2937] text-gray-100"
                  }`}
                >
                  <div className="text-xs text-gray-300 font-semibold">
                    {m.sender === username ? "You" : m.sender}
                  </div>
                  <div className="mt-1 text-sm">{m.message}</div>
                  <div className="mt-1 text-[10px] text-gray-500">
                    {new Date(m.createdAt).toLocaleTimeString()}
                  </div>
                </div>
              </div>
            ))}
            <div ref={scrollRef} />
          </div>
        </div>

        {/* Input Box */}
        <div className="p-4 flex items-center gap-3 border-t border-[#1f2937]">
          <button className="h-10 w-10 rounded-full bg-[#0f1724] border border-[#23303b]">
            +
          </button>
          <input
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && handleSend()}
            placeholder="Type your message here..."
            className="flex-1 h-12 px-4 rounded-full bg-[#071127] border border-[#23303b] outline-none"
          />
          <button
            onClick={handleSend}
            className="h-10 px-6 rounded-full bg-blue-500 hover:bg-blue-600 text-white"
          >
            Send
          </button>
        </div>
      </div>
    </div>
  );
}
