"use client";

import React, { useEffect, useRef, useState } from "react";
import { io, Socket } from "socket.io-client";
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
  text: string | null;
  createdAt: string;
  sender: Sender;
};

export default function ChatPage() {
  const router = useRouter();
  const bottomRef = useRef<HTMLDivElement | null>(null);

  const [socket, setSocket] = useState<Socket | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [text, setText] = useState("");
  const [me, setMe] = useState<Sender | null>(null);
  const [onlineCount, setOnlineCount] = useState(0);

  const API_URL =
    process.env.NEXT_PUBLIC_API_URL || "http://localhost:9002";

  // =========================
  // INIT (LOGIN + SOCKET)
  // =========================
  useEffect(() => {
    const token = localStorage.getItem("token");
    if (!token) {
      router.push("/");
      return;
    }

    let s: Socket;

    (async () => {
      try {
        // 🔒 ambil user VALID dari backend
        const res = await fetch(`${API_URL}/api/auth/profile`, {
          headers: { Authorization: `Bearer ${token}` },
        });

        if (!res.ok) {
          router.push("/");
          return;
        }

        const data = await res.json();
        const currentUser: Sender = {
          id: Number(data.user.id),
          username: data.user.username,
          email: data.user.email,
        };

        setMe(currentUser);

        // 🔌 CONNECT SOCKET (HANYA SEKALI)
        s = io(API_URL, {
          transports: ["websocket"],
          auth: { token },
        });

        setSocket(s);

        // ===== ONLINE COUNT (ANTI DOBEL)
        s.on("onlineCount", (count: number) => {
          setOnlineCount(count);
        });

        // ===== RECEIVE MESSAGE (ANTI DUPLIKAT)
        s.on("receive_message", (msg: Message) => {
          setMessages((prev) => {
            if (prev.some((m) => m.id === msg.id)) {
              return prev; // 🚫 sudah ada
            }
            return [...prev, msg];
          });
          scrollToBottom();
        });

        // ===== FETCH HISTORY SEKALI
        await fetchMessages(token);
      } catch (err) {
        console.error("Init error:", err);
        router.push("/");
      }
    })();

    return () => {
      if (s) {
        s.off("receive_message");
        s.off("onlineCount");
        s.disconnect();
      }
      setSocket(null);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // =========================
  // FETCH HISTORY (ANTI DUPLIKAT)
  // =========================
  async function fetchMessages(token: string) {
    try {
      const res = await fetch(`${API_URL}/api/messages`, {
        headers: { Authorization: `Bearer ${token}` },
      });

      if (!res.ok) return;

      const data: Message[] = await res.json();

      setMessages((prev) => {
        const merged = [...prev];
        data.forEach((msg) => {
          if (!merged.some((m) => m.id === msg.id)) {
            merged.push(msg);
          }
        });
        return merged;
      });

      scrollToBottom();
    } catch (err) {
      console.error("Fetch messages error:", err);
    }
  }

  // =========================
  // SEND MESSAGE
  // =========================
  async function handleSend() {
    if (!text.trim()) return;

    await fetch(`${API_URL}/api/messages`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${localStorage.getItem("token")}`,
      },
      body: JSON.stringify({ text }),
    });

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

  function isMine(msg: Message): boolean {
    if (!me || !msg.sender) return false;
    return Number(msg.sender.id) === Number(me.id);
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
            if (!me) return null;
            const mine = isMine(m);

            return (
              <div
                key={m.id}
                className={`flex ${mine ? "justify-end" : "justify-start"}`}
              >
                <div
                  className={`max-w-[75%] px-4 py-2 rounded-xl break-words ${
                    mine
                      ? "bg-[#2563eb] rounded-br-none"
                      : "bg-[#1f2937] rounded-bl-none"
                  }`}
                >
                  <div className="text-xs text-gray-300 mb-1">
                    {mine ? "You" : m.sender.username}
                  </div>
                  <div className="text-sm">{m.text}</div>
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
