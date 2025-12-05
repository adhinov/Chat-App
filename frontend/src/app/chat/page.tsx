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
  } catch {
    return null;
  }
}

export default function ChatPage() {
  const router = useRouter();
  const [socket, setSocket] = useState<Socket | null>(null);
  const [username, setUsername] = useState<string>("");
  const [input, setInput] = useState("");
  const [messages, setMessages] = useState<Message[]>([]);

  const scrollRef = useRef<HTMLDivElement | null>(null);
  const messagesRef = useRef<HTMLDivElement | null>(null);

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
      transports: ["websocket"],
      withCredentials: true,
    });

    setSocket(s);

    s.on("connect", () => {
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
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  function handleSend() {
    if (!input.trim() || !socket) return;

    const msg: Message = {
      sender: username,
      message: input.trim(),
      createdAt: new Date().toISOString(),
    };

    socket.emit("send_message", msg);
    setInput("");
  }

  function handleLogout() {
    localStorage.removeItem("token");
    router.push("/");
  }

  return (
    // prevent horizontal scroll on mobile
    <div className="h-[100dvh] flex flex-col bg-[#0f1724] text-white overflow-hidden">
      {/* header sticky inside card area */}
      <div className="flex items-center justify-between p-4 border-b border-[#1f2937] bg-[#101827] sticky top-0 z-20">
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

      {/* messages: allow vertical scroll only, prevent horizontal scroll */}
      <div
        ref={messagesRef}
        className="flex-1 overflow-y-auto overflow-x-hidden px-2 sm:px-4 py-3"
        style={{ WebkitOverflowScrolling: "touch", touchAction: "pan-y" }}
      >
        <div className="space-y-3">
          {messages.map((m, idx) => (
            <div key={idx} className={`flex ${m.sender === username ? "justify-end" : "justify-start"}`}>
              <div
                className={`px-4 py-2 rounded-xl break-words ${
                  m.sender === username
                    ? "bg-[#2a4365] text-white max-w-[85%] sm:max-w-[70%]"
                    : m.sender === "System"
                    ? "bg-[#374151] text-gray-200 max-w-[85%] sm:max-w-[70%]"
                    : "bg-[#1f2937] text-gray-100 max-w-[85%] sm:max-w-[70%]"
                }`}
              >
                <div className="text-xs text-gray-300 font-semibold">
                  {m.sender === username ? "You" : m.sender}
                </div>
                <div className="mt-1 text-sm whitespace-pre-wrap">{m.message}</div>
                <div className="mt-1 text-[10px] text-gray-500">
                  {new Date(m.createdAt).toLocaleTimeString()}
                </div>
              </div>
            </div>
          ))}
          <div ref={scrollRef} />
        </div>
      </div>

      {/* input sticky bottom */}
      <div className="p-3 flex items-center gap-3 border-t border-[#1f2937] bg-[#101827] sticky bottom-0 z-20">
        <button className="h-10 w-10 rounded-full bg-[#0f1724] border border-[#23303b]">+</button>

        <input
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && handleSend()}
          placeholder="Type your message..."
          className="flex-1 h-11 px-4 rounded-full bg-[#071127] border border-[#23303b] outline-none text-sm"
        />

        <button
          onClick={handleSend}
          className="h-10 px-5 rounded-full bg-blue-500 hover:bg-blue-600"
        >
          Send
        </button>
      </div>
    </div>
  );
}
