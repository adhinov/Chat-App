"use client";

import React, { useEffect, useRef, useState } from "react";
import io, { Socket } from "socket.io-client";
import { useRouter } from "next/navigation";

// =========================
// TYPES
// =========================
type Sender = {
  id: number;
  username: string;
  email?: string;
};

type Message = {
  id: number;
  text: string;
  createdAt: string;
  sender: Sender;
};

// =========================
// HELPERS
// =========================
function decodeToken(token: string | null): any | null {
  if (!token) return null;
  try {
    return JSON.parse(atob(token.split(".")[1]));
  } catch {
    return null;
  }
}

// =========================
// COMPONENT
// =========================
export default function ChatPage() {
  const router = useRouter();

  const [socket, setSocket] = useState<Socket | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [text, setText] = useState("");
  const [me, setMe] = useState<Sender | null>(null);
  const [onlineCount, setOnlineCount] = useState(0);

  const bottomRef = useRef<HTMLDivElement | null>(null);

  const API_URL =
    process.env.NEXT_PUBLIC_API_URL || "http://localhost:9002";

  // =========================
  // INIT
  // =========================
  useEffect(() => {
    const token = localStorage.getItem("token");
    if (!token) {
      router.push("/");
      return;
    }

    const payload = decodeToken(token);
    if (!payload) {
      router.push("/");
      return;
    }

    const currentUser: Sender = {
      id: payload.id,
      username: payload.username || payload.email,
      email: payload.email,
    };

    setMe(currentUser);

    const s = io(API_URL, {
      transports: ["websocket"],
      auth: { token },
    });

    setSocket(s);

    // ONLINE COUNT
    s.on("onlineCount", (count: number) => {
      setOnlineCount(count);
    });

    // RECEIVE MESSAGE (SATU-SATUNYA SUMBER MESSAGE)
    s.on("receive-message", (msg: Message) => {
      setMessages((prev) => [...prev, msg]);
      scrollToBottom();
    });

    // FETCH HISTORY
    fetchMessages(token);

    return () => {
      s.disconnect();
      setSocket(null);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // =========================
  // FETCH HISTORY
  // =========================
  async function fetchMessages(token: string) {
    try {
      const res = await fetch(`${API_URL}/api/messages`, {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      if (!res.ok) return;

      const data: Message[] = await res.json();
      setMessages(data);
      scrollToBottom();
    } catch (err) {
      console.error("Fetch messages error:", err);
    }
  }

  // =========================
  // SEND MESSAGE (NO OPTIMISTIC UI)
  // =========================
  function handleSend() {
    if (!text.trim() || !socket) return;

    socket.emit("send-message", { text });
    setText("");
  }

  // =========================
  // HELPERS
  // =========================
  function scrollToBottom() {
    setTimeout(() => {
      bottomRef.current?.scrollIntoView({ behavior: "smooth" });
    }, 50);
  }

  function isMine(msg: Message) {
    return msg.sender.id === me?.id;
  }

  // =========================
  // RENDER
  // =========================
  return (
    <div className="h-[100dvh] flex justify-center bg-[#0f1724] text-white">
      <div className="flex flex-col w-full sm:max-w-xl bg-[#101827]">

        {/* HEADER */}
        <div className="flex items-center justify-between p-4 border-b border-white/10">
          <div>
            <div className="font-semibold">
              Chat Room {me && `- ${me.username}`}
            </div>
            <div className="text-xs text-gray-400">
              Online: {onlineCount}
            </div>
          </div>

          <button
            onClick={() => {
              localStorage.removeItem("token");
              router.push("/");
            }}
            className="text-sm text-red-400"
          >
            Logout
          </button>
        </div>

        {/* MESSAGES */}
        <div className="flex-1 overflow-y-auto px-3 py-3 space-y-3">
          {messages.map((m) => {
            const mine = isMine(m);
            return (
              <div
                key={m.id}
                className={`flex ${mine ? "justify-end" : "justify-start"}`}
              >
                <div
                  className={`px-4 py-2 rounded-xl max-w-[75%] break-words ${
                    mine ? "bg-[#2a4365]" : "bg-[#1f2937]"
                  }`}
                >
                  <div className="text-xs text-gray-300">
                    {mine ? "You" : m.sender.username}
                  </div>
                  <div className="text-sm mt-1">{m.text}</div>
                </div>
              </div>
            );
          })}
          <div ref={bottomRef} />
        </div>

        {/* INPUT */}
        <div className="p-3 border-t border-white/10 flex gap-2">
          <input
            value={text}
            onChange={(e) => setText(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && handleSend()}
            placeholder="Type message..."
            className="flex-1 bg-[#11172c] rounded-full px-4 h-11 outline-none"
          />
          <button
            onClick={handleSend}
            className="h-11 w-11 rounded-full bg-[#ff6b35] flex items-center justify-center"
          >
            ➤
          </button>
        </div>
      </div>
    </div>
  );
}
