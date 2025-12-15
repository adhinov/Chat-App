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
  image?: string | null;
  createdAt: string;
  sender: Sender;
};

export default function ChatPage() {
  const router = useRouter();
  const bottomRef = useRef<HTMLDivElement | null>(null);
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  const [socket, setSocket] = useState<Socket | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [text, setText] = useState("");
  const [me, setMe] = useState<Sender | null>(null);
  const [onlineCount, setOnlineCount] = useState(0);
  const [menuOpen, setMenuOpen] = useState(false);

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

    let s: Socket;

    (async () => {
      try {
        const res = await fetch(`${API_URL}/api/auth/profile`, {
          headers: { Authorization: `Bearer ${token}` },
        });

        if (!res.ok) return router.push("/");

        const data = await res.json();
        const currentUser: Sender = {
          id: Number(data.user.id),
          username: data.user.username,
          email: data.user.email,
        };

        setMe(currentUser);

        s = io(API_URL, {
          transports: ["websocket"],
          auth: { token },
        });

        setSocket(s);

        s.on("onlineCount", setOnlineCount);

        s.on("receive_message", (msg: Message) => {
          setMessages((prev) =>
            prev.some((m) => m.id === msg.id) ? prev : [...prev, msg]
          );
          scrollToBottom();
        });

        await fetchMessages(token);
      } catch (err) {
        console.error(err);
        router.push("/");
      }
    })();

    return () => {
      if (s) {
        s.disconnect();
      }
    };
    // eslint-disable-next-line
  }, []);

  // =========================
  // FETCH HISTORY
  // =========================
  async function fetchMessages(token: string) {
    const res = await fetch(`${API_URL}/api/messages`, {
      headers: { Authorization: `Bearer ${token}` },
    });

    if (!res.ok) return;

    const data: Message[] = await res.json();
    setMessages(data);
    scrollToBottom();
  }

  // =========================
  // SEND TEXT
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
  // SEND IMAGE
  // =========================
  async function handleImageUpload(file: File) {
    const formData = new FormData();
    formData.append("image", file);

    await fetch(`${API_URL}/api/messages/upload`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${localStorage.getItem("token")}`,
      },
      body: formData,
    });
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
    return me && msg.sender.id === me.id;
  }

  // =========================
  // RENDER
  // =========================
  return (
    <div className="h-[100dvh] flex justify-center bg-[#0f1724] text-white">
      <div className="flex flex-col w-full sm:max-w-xl bg-[#101827]">

        {/* HEADER */}
        <div className="flex items-center justify-between p-4 border-b border-white/10 relative">
          <div>
            <div className="font-semibold">
              Chat Room {me && `- ${me.username}`}
            </div>
            <div className="text-xs text-gray-400">
              Online: {onlineCount}
            </div>
          </div>

          {/* MENU */}
          <div className="relative">
            <button
              onClick={() => setMenuOpen(!menuOpen)}
              className="h-9 w-9 rounded-full bg-[#1f2937] flex items-center justify-center"
            >
              ⚙️
            </button>

            {menuOpen && (
              <div className="absolute right-0 mt-2 w-40 bg-[#1f2937] rounded-lg shadow-lg overflow-hidden">
                <button
                  onClick={() => {
                    setMenuOpen(false);
                    router.push("/profile");
                  }}
                  className="w-full text-left px-4 py-2 hover:bg-white/10"
                >
                  Edit Profile
                </button>
                <button
                  onClick={() => {
                    localStorage.removeItem("token");
                    router.push("/");
                  }}
                  className="w-full text-left px-4 py-2 text-red-400 hover:bg-white/10"
                >
                  Logout
                </button>
              </div>
            )}
          </div>
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
                  className={`max-w-[75%] px-4 py-2 rounded-xl ${
                    mine
                      ? "bg-[#2563eb] rounded-br-none"
                      : "bg-[#1f2937] rounded-bl-none"
                  }`}
                >
                  <div className="text-xs text-gray-300 mb-1">
                    {mine ? "You" : m.sender.username}
                  </div>

                  {m.image && (
                    <img
                      src={m.image}
                      alt="upload"
                      className="rounded-lg mb-2 max-h-60"
                    />
                  )}

                  {m.text && <div className="text-sm">{m.text}</div>}
                </div>
              </div>
            );
          })}
          <div ref={bottomRef} />
        </div>

        {/* INPUT */}
        <div className="p-3 border-t border-white/10 flex gap-2 items-center">
          <button
            onClick={() => fileInputRef.current?.click()}
            className="h-11 w-11 rounded-full bg-[#1f2937] text-xl"
          >
            +
          </button>

          <input
            ref={fileInputRef}
            type="file"
            accept="image/*"
            hidden
            onChange={(e) =>
              e.target.files && handleImageUpload(e.target.files[0])
            }
          />

          <input
            value={text}
            onChange={(e) => setText(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && handleSend()}
            placeholder="Type message..."
            className="flex-1 bg-[#11172c] rounded-full px-4 h-11 outline-none"
          />

          <button
            onClick={handleSend}
            className="h-11 w-11 rounded-full bg-[#ff6b35]"
          >
            ➤
          </button>
        </div>
      </div>
    </div>
  );
}
