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
    return JSON.parse(atob(token.split(".")[1]));
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

  const API_URL =
    typeof window !== "undefined" && process.env.NEXT_PUBLIC_API_URL
      ? process.env.NEXT_PUBLIC_API_URL
      : typeof window !== "undefined"
      ? window.location.origin
      : "http://localhost:9002";

  useEffect(() => {
    const token = typeof window !== "undefined" ? localStorage.getItem("token") : null;
    const payload = decodeToken(token);

    if (!payload) return router.push("/");

    const name = payload.username || payload.name || payload.email || "User";
    setUsername(name);

    const s = io(API_URL, {
      transports: ["websocket"],
      withCredentials: true,
    });

    setSocket(s);

    s.on("receive_message", (data: Message) => {
      setMessages((prev) => [...prev, data]);
      setTimeout(() => scrollRef.current?.scrollIntoView({ behavior: "smooth" }), 20);
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
      return undefined;
    };
  }, []);

  function handleSend() {
    if (!input.trim() || !socket) return;

    socket.emit("send_message", {
      sender: username,
      message: input,
      createdAt: new Date().toISOString(),
    });

    setInput("");
  }

  function handleLogout() {
    localStorage.removeItem("token");
    router.push("/");
  }

  return (
    <div className="h-[100dvh] w-full bg-[#0f1724] text-white flex flex-col overflow-hidden">

      {/* CARD - NO CENTERING */}
      <div className="flex flex-col w-full h-full sm:max-w-xl sm:mx-auto sm:h-[92vh] sm:mt-4 bg-[#101827] sm:rounded-xl border border-[#1f2937] shadow-xl overflow-hidden">

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

        {/* MESSAGE LIST */}
        <div className="flex-1 overflow-y-auto px-3 py-3">
          <div className="space-y-3">
            {messages.map((m, i) => (
              <div key={i} className={`flex ${m.sender === username ? "justify-end" : "justify-start"}`}>
                <div
                  className={`px-4 py-2 rounded-xl max-w-[80%] break-words ${
                    m.sender === username
                      ? "bg-[#2a4365]"
                      : m.sender === "System"
                      ? "bg-[#374151]"
                      : "bg-[#1f2937]"
                  }`}
                >
                  <div className="text-xs text-gray-300">
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

        {/* INPUT AREA — FIXED BOTTOM */}
        <div className="p-3 flex items-center gap-3 border-t border-[#1f2937] bg-[#0f1724]">

          <button className="h-10 w-10 aspect-square bg-[#0f1724] border border-[#23303b] rounded-lg text-xl flex items-center justify-center">
            +
          </button>

          <input
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && handleSend()}
            placeholder="Type your message..."
            className="flex-1 h-11 px-4 rounded-lg bg-[#071127] border border-[#23303b] outline-none text-sm"
          />

          {/* SEND BUTTON PERFECT CIRCLE */}
          <button
            onClick={handleSend}
            aria-label="Send"
            className="h-11 w-11 aspect-square flex items-center justify-center rounded-full bg-[#eb5d2d] hover:bg-[#d9530a] active:scale-95 transition-all"
          >
            <svg
              xmlns="http://www.w3.org/2000/svg"
              viewBox="0 0 24 24"
              fill="none"
              stroke="white"
              strokeWidth="1.6"
              strokeLinecap="round"
              strokeLinejoin="round"
              width="20"
              height="20"
            >
              <path d="M22 2L11 13" />
              <path d="M22 2l-7 20 -4-9 -9-4 20-7z" />
            </svg>
          </button>
        </div>
      </div>
    </div>
  );
}
