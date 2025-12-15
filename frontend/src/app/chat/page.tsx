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
  image?: string | null; // 🔥 cloudinary
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
  const [plusOpen, setPlusOpen] = useState(false);

  const API_URL =
    process.env.NEXT_PUBLIC_API_URL || "http://localhost:9002";

  // =========================
  // INIT (AUTH + SOCKET)
  // =========================
  useEffect(() => {
    const token = localStorage.getItem("token");
    if (!token) {
      router.push("/");
      return;
    }

    const s = io(API_URL, {
      transports: ["websocket"],
      auth: { token },
    });

    setSocket(s);

    (async () => {
      try {
        const res = await fetch(`${API_URL}/api/auth/profile`, {
          headers: { Authorization: `Bearer ${token}` },
        });

        if (!res.ok) {
          router.push("/");
          return;
        }

        const data = await res.json();
        setMe({
          id: Number(data.user.id),
          username: data.user.username,
          email: data.user.email,
        });

        s.on("onlineCount", setOnlineCount);

        // 🔥 FIX UTAMA DI SINI
        s.on("receive_message", (msg: Message) => {
          setMessages((prev) => {
            const idx = prev.findIndex((m) => m.id === msg.id);
            if (idx !== -1) {
              const updated = [...prev];
              updated[idx] = msg; // replace data lama
              return updated;
            }
            return [...prev, msg];
          });

          scrollToBottom();
        });

        await fetchMessages(token);
      } catch (err) {
        console.error("Init error:", err);
        router.push("/");
      }
    })();

    return () => {
      s.off("onlineCount");
      s.off("receive_message");
      s.disconnect();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
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

    const res = await fetch(`${API_URL}/api/messages/upload`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${localStorage.getItem("token")}`,
      },
      body: formData,
    });

    if (!res.ok) return;

    const msg: Message = await res.json();

    // 🔥 SYNC STATE (replace / add)
    setMessages((prev) => {
      const idx = prev.findIndex((m) => m.id === msg.id);
      if (idx !== -1) {
        const updated = [...prev];
        updated[idx] = msg;
        return updated;
      }
      return [...prev, msg];
    });

    scrollToBottom();
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

  function formatTime(date: string) {
    return new Date(date).toLocaleTimeString("id-ID", {
      hour: "2-digit",
      minute: "2-digit",
    });
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

          <button
            onClick={() => setMenuOpen((p) => !p)}
            className="w-9 aspect-square rounded-full bg-white/10 flex items-center justify-center"
          >
            ⚙️
          </button>

          {menuOpen && (
            <div className="absolute right-4 top-14 bg-[#1f2937] rounded-xl shadow-lg overflow-hidden text-sm">
              <button
                onClick={() => {
                  setMenuOpen(false);
                  router.push("/profile");
                }}
                className="block w-full px-4 py-2 hover:bg-white/10 text-left"
              >
                Edit Profile
              </button>
              <button
                onClick={() => {
                  localStorage.removeItem("token");
                  router.push("/");
                }}
                className="block w-full px-4 py-2 hover:bg-white/10 text-left text-red-400"
              >
                Logout
              </button>
            </div>
          )}
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

                  {/* IMAGE */}
                  {m.image && (
                    <img
                      src={m.image}
                      alt="upload"
                      className="rounded-lg mb-2 max-h-60"
                    />
                  )}

                  {m.text && <div className="text-sm">{m.text}</div>}

                  <div className="text-[10px] text-gray-300 text-right mt-1">
                    {formatTime(m.createdAt)}
                  </div>
                </div>
              </div>
            );
          })}
          <div ref={bottomRef} />
        </div>

        {/* INPUT BAR */}
        <div className="p-3 border-t border-white/10">
          <div className="relative flex items-center gap-2 bg-[#11172c] rounded-full px-2 h-12">

            {/* PLUS */}
            <button
              onClick={() => setPlusOpen((p) => !p)}
              className="w-9 aspect-square rounded-full bg-white/10 flex items-center justify-center text-xl"
            >
              +
            </button>

            {plusOpen && (
              <div className="absolute bottom-14 left-2 bg-[#1f2937] rounded-xl shadow-lg overflow-hidden text-sm">
                <button
                  onClick={() => {
                    setPlusOpen(false);
                    fileInputRef.current?.click();
                  }}
                  className="block w-full px-4 py-2 hover:bg-white/10 text-left"
                >
                  📷 Upload Gambar
                </button>
              </div>
            )}

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
              className="flex-1 bg-transparent outline-none text-sm"
            />

            <button
              onClick={handleSend}
              className="w-10 aspect-square rounded-full bg-[#ff6b35] flex items-center justify-center text-lg"
            >
              ➤
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
