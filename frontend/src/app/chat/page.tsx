"use client";

import React, { useEffect, useRef, useState } from "react";
import io, { Socket } from "socket.io-client";
import { useRouter } from "next/navigation";

// Chat page for Next.js App Router. Put this file at `src/app/chat/page.tsx`.
// Depends on: socket.io-client installed, TailwindCSS configured.

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
  const messagesRef = useRef<HTMLDivElement | null>(null);
  const scrollRef = useRef<HTMLDivElement | null>(null);

  // API / Socket URL - fallback to origin
  const API_URL =
    typeof window !== "undefined" && process.env.NEXT_PUBLIC_API_URL
      ? process.env.NEXT_PUBLIC_API_URL
      : (typeof window !== "undefined" ? window.location.origin : "http://localhost:9002");

  useEffect(() => {
    // auth guard: read token from localStorage
    const token = typeof window !== "undefined" ? localStorage.getItem("token") : null;
    const payload = decodeToken(token);
    if (!payload) {
      router.push("/");
      return;
    }

    // set username from token if present, fallback to "User"
    const name = payload.username || payload.name || payload.email || "User";
    setUsername(name);

    // connect socket
    const s = io(API_URL, {
      path: "/socket.io",
      transports: ["websocket"],
      withCredentials: true,
    });

    setSocket(s);

    s.on("connect", () => {
      setConnected(true);
      // announce join
      s.emit("send_message", {
        sender: name,
        message: `${name} joined the chat`,
        createdAt: new Date().toISOString(),
      });
    });

    s.on("receive_message", (data: Message) => {
      setMessages((prev) => [...prev, data]);
      // scroll to bottom
      setTimeout(() => scrollRef.current?.scrollIntoView({ behavior: "smooth" }), 50);
    });

    s.on("disconnect", () => {
      setConnected(false);
    });

    // preload welcome message
    setMessages([
      {
        sender: "System",
        message: `Hello ${name}! Welcome to the chat room.`,
        createdAt: new Date().toISOString(),
      },
    ]);

    return () => {
      s.disconnect();
      setSocket(null);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  function handleSend() {
    if (!input.trim()) return;
    const msg: Message = {
      sender: username,
      message: input.trim(),
      createdAt: new Date().toISOString(),
    };

    // optimistically render
    setMessages((p) => [...p, msg]);
    setInput("");
    scrollRef.current?.scrollIntoView({ behavior: "smooth" });

    if (socket) {
      socket.emit("send_message", msg);
    }
  }

  function handleLogout() {
    localStorage.removeItem("token");
    router.push("/");
  }

  return (
    <div className="min-h-screen bg-[#0f1724] text-white flex flex-col">
      {/* Header */}
      <header className="flex items-center justify-between px-6 py-4 border-b border-[#1f2937] bg-[#0b1220]">
        <div className="flex items-center gap-3">
          <div className="h-10 w-10 rounded-full bg-green-500 flex items-center justify-center font-bold">{username?.[0]?.toUpperCase() || "U"}</div>
          <div>
            <div className="font-semibold">{username}</div>
            <div className="text-xs text-gray-300">Online {connected ? "•" : "(disconnected)"}</div>
          </div>
        </div>

        <div className="flex items-center gap-3">
          <button onClick={() => {}} className="px-3 py-1 rounded bg-transparent border border-[#23303b] text-sm">Profile</button>
          <button onClick={handleLogout} className="px-3 py-1 rounded bg-red-600 text-sm">Logout</button>
        </div>
      </header>

      {/* Chat area */}
      <main className="flex-1 p-6 flex flex-col max-w-4xl mx-auto w-full">
        <div className="flex-1 bg-[#101827] rounded-lg shadow-inner p-4 overflow-y-auto" ref={messagesRef}>
          <div className="space-y-3">
            {messages.map((m, idx) => (
              <div key={idx} className={`flex ${m.sender === username ? "justify-end" : "justify-start"}`}>
                <div className={`max-w-[70%] px-4 py-2 rounded-lg ${m.sender === username ? "bg-[#2a4365] text-white" : "bg-[#1f2937] text-gray-100"}`}>
                  <div className="text-xs text-gray-300 font-semibold">{m.sender === username ? "You" : m.sender}</div>
                  <div className="mt-1 text-sm">{m.message}</div>
                  <div className="mt-1 text-[10px] text-gray-500">{new Date(m.createdAt).toLocaleTimeString()}</div>
                </div>
              </div>
            ))}
            <div ref={scrollRef} />
          </div>
        </div>

        {/* Composer */}
        <div className="mt-4 flex items-center gap-3">
          <button className="h-10 w-10 rounded-full bg-[#0f1724] border border-[#23303b]">+</button>
          <input
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={(e) => { if (e.key === 'Enter') handleSend(); }}
            placeholder="Type your message here..."
            className="flex-1 h-12 px-4 rounded-full bg-[#071127] border border-[#23303b] outline-none"
          />
          <button onClick={handleSend} className="h-10 px-4 rounded-full bg-blue-500 text-white">Send</button>
        </div>
      </main>

    </div>
  );
}
