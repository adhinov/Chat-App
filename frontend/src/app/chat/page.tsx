"use client";

import React, { useEffect, useRef, useState } from "react";
import { io, Socket } from "socket.io-client";
import { useRouter } from "next/navigation";

/* =========================
   TYPES
========================= */
type Sender = {
  id: number;
  username: string;
  email?: string;
  avatar?: string | null;
};

type Message = {
  id: number | string;
  text: string | null;
  image?: string | null;
  createdAt: string;
  sender: Sender;
  pending?: boolean;
};

export type CurrentUser = {
  id: number;
  email: string;
  username: string;
  phone?: string | null;
  avatar?: string | null;
  role: string;

  previousLogin?: string | null;
};

/* =========================
   COMPONENT
========================= */
export default function ChatPage() {
  const router = useRouter();

  const bottomRef = useRef<HTMLDivElement | null>(null);
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const socketRef = useRef<Socket | null>(null);
  const tokenRef = useRef<string>("");

  const [messages, setMessages] = useState<Message[]>([]);
  const [text, setText] = useState("");
  const [me, setMe] = useState<CurrentUser | null>(null);
  const [onlineCount, setOnlineCount] = useState(0);

  const [menuOpen, setMenuOpen] = useState(false);
  const [plusOpen, setPlusOpen] = useState(false);
  const [previewImage, setPreviewImage] = useState<string | null>(null);

  const API_URL =
    process.env.NEXT_PUBLIC_API_URL || "http://localhost:9002";

  /* =========================
     LOGOUT
  ========================= */
  const handleLogout = () => {
    localStorage.removeItem("token");
    socketRef.current?.disconnect();
    router.push("/");
  };

  /* =========================
   INIT (AUTH + SOCKET) - FIX
  ========================= */
  useEffect(() => {
    if (socketRef.current) return;

    const token = localStorage.getItem("token");
    if (!token) {
      router.push("/");
      return;
    }

    tokenRef.current = token;

    const socket = io(API_URL, {
      transports: ["websocket"],
      auth: { token },
    });

    socketRef.current = socket;

    // 🔥 helper fetch me (dipakai ulang)
    const fetchMe = async () => {
      const res = await fetch(`${API_URL}/api/auth/me`, {
        headers: {
          Authorization: `Bearer ${tokenRef.current}`,
        },
      });

      if (!res.ok) {
        router.push("/");
        return;
      }

      const data: CurrentUser = await res.json();
      setMe(data);
    };

    async function init() {
      try {
        // 1️⃣ Ambil data user pertama kali
        await fetchMe();

        // 2️⃣ Online count
        socket.on("onlineCount", setOnlineCount);

        // 3️⃣ 🔥 PENTING: refresh ME setelah socket connect
        socket.on("connect", async () => {
          await fetchMe(); // ⬅️ INI KUNCI LAST LOGIN
        });

        // 4️⃣ Message handler
        socket.on("receive_message", (msg: Message) => {
          setMessages((prev) => {
            const idx = prev.findIndex(
              (m) =>
                m.pending &&
                m.text === msg.text &&
                m.sender.id === msg.sender.id
            );

            if (idx !== -1) {
              const clone = [...prev];
              clone[idx] = msg;
              return clone;
            }

            if (prev.some((m) => m.id === msg.id)) return prev;

            return [...prev, msg];
          });

          scrollToBottom();
        });

        await fetchMessages();
      } catch (err) {
        console.error("Init error:", err);
        router.push("/");
      }
    }

    init();

    return () => {
      socket.disconnect();
      socketRef.current = null;
    };
  }, []);

    /* =========================
      FETCH HISTORY
    ========================= */
    async function fetchMessages() {
    const token = tokenRef.current;
    if (!token) return;

    const res = await fetch(`${API_URL}/api/messages`, {
      headers: {
        Authorization: `Bearer ${token}`,
      },
    });

      if (!res.ok) return;

      const data: Message[] = await res.json();
      setMessages(data);
      scrollToBottom();
    }

  /* =========================
     SEND TEXT
  ========================= */
  async function handleSend() {
    if (!text.trim() || !me) return;

    const messageText = text;
    setText("");

    setMessages((prev) => [
      ...prev,
      {
        id: `temp-${Date.now()}`,
        text: messageText,
        image: null,
        createdAt: new Date().toISOString(),
        sender: {
          id: me.id,
          username: me.username,
          avatar: me.avatar,
        },
        pending: true,
      },
    ]);

    scrollToBottom();

    try {
      await fetch(`${API_URL}/api/messages`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${tokenRef.current}`,
        },
        body: JSON.stringify({ text: messageText }),
      });
    } catch (err) {
      console.error("Send error:", err);
    }
  }

  /* =========================
     SEND IMAGE
  ========================= */
  async function handleImageUpload(file: File) {
    const token = tokenRef.current;
    if (!token) return;

    const formData = new FormData();
    formData.append("image", file);

    await fetch(`${API_URL}/api/messages/upload`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${token}`,
      },
      body: formData,
    });
  }

  /* =========================
     HELPERS
  ========================= */
  function scrollToBottom() {
    setTimeout(() => {
      bottomRef.current?.scrollIntoView({ behavior: "smooth" });
    }, 50);
  }

  function isMine(msg: Message) {
    return !!me && msg.sender.id === me.id;
  }

  function formatTime(date: string) {
    return new Date(date).toLocaleTimeString("id-ID", {
      timeZone: "Asia/Jakarta",
      hour: "2-digit",
      minute: "2-digit",
    });
  }

  function formatLastLogin(date?: string | null) {
    if (!date) return "First Login";

    return new Date(date).toLocaleString("id-ID", {
      timeZone: "Asia/Jakarta",
      day: "2-digit",
      month: "2-digit",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    }) + " WIB";
  }

  function isValidImageUrl(url?: string | null) {
    return typeof url === "string" && url.startsWith("http");
  }

  /* =========================
     RENDER
  ========================= */
  return (
    <>
      <div className="h-[100dvh] flex justify-center bg-[#0f1724] text-white">
        <div className="flex flex-col w-full sm:max-w-xl bg-[#101827]">

          {/* ================= HEADER ================= */}
          <div className="flex items-center justify-between p-4 border-b border-white/10 bg-[#101827]">
            <div className="flex items-center gap-3">
              <button
                onClick={() => router.push("/profile")}
                className="w-10 h-10 rounded-full bg-[#2563eb] overflow-hidden flex items-center justify-center"
              >
                {me?.avatar ? (
                  <img src={me.avatar} className="w-full h-full object-cover" />
                ) : (
                  <span className="font-bold">
                    {me?.username?.charAt(0)}
                  </span>
                )}
              </button>

              <div>
                <div className="font-semibold text-orange-400">
                  Chat Room {me && `- ${me.username}`}
                </div>
                <div className="flex flex-col sm:flex-row sm:items-center gap-0.5 sm:gap-1 text-[11px] sm:text-xs leading-tight">
                  <span className="text-yellow-200 font-semibold">
                    Online: {onlineCount}
                  </span>
                  <span className="hidden sm:inline text-gray-400">-</span>
                  <span className="text-gray-400">
                    Last Login: {formatLastLogin(me?.previousLogin)}
                  </span>
                </div>
              </div>
            </div>

            {/* ===== GEAR ===== */}
            <div className="relative">
              <button
                onClick={() => setMenuOpen((p) => !p)}
                className="w-9 h-9 rounded-full bg-white/10 hover:bg-white/20"
              >
                ⚙️
              </button>

              {menuOpen && (
                <div className="absolute right-0 mt-2 w-40 bg-[#1f2937] rounded-xl shadow-lg overflow-hidden z-50">
                  <button
                    onClick={() => router.push("/profile")}
                    className="block w-full text-left px-4 py-2 text-sm hover:bg-white/10"
                  >
                    Profile
                  </button>
                  <button
                    onClick={handleLogout}
                    className="block w-full text-left px-4 py-2 text-sm text-red-400 hover:bg-white/10"
                  >
                    Logout
                  </button>
                </div>
              )}
            </div>
          </div>

          {/* ================= MESSAGES ================= */}
          <div className="flex-1 overflow-y-auto px-3 py-3 space-y-3">
            {messages.map((m) => {
              const mine = isMine(m);
              return (
                <div key={m.id} className={`flex ${mine ? "justify-end" : "justify-start"}`}>
                  <div
                    className={`max-w-[75%] px-4 py-2 rounded-xl ${
                      mine
                        ? "bg-[#2563eb] rounded-br-none"
                        : "bg-[#1f2937] rounded-bl-none"
                    } ${m.pending ? "opacity-60 animate-pulse" : ""}`}
                  >
                    <div
                      className={`text-xs mb-1 ${
                        mine ? "text-gray-300" : "text-blue-400 font-semibold"
                      }`}
                    >
                      {mine ? "You" : m.sender.username}
                    </div>

                    {isValidImageUrl(m.image) && (
                      <img
                        src={m.image!}
                        onClick={() => setPreviewImage(m.image!)}
                        className="rounded-lg mb-2 max-h-60 cursor-pointer"
                      />
                    )}

                    {m.text && <div className="text-sm">{m.text}</div>}

                    <div className="text-[10px] text-right text-gray-300 mt-1">
                      {formatTime(m.createdAt)}
                    </div>
                  </div>
                </div>
              );
            })}
            <div ref={bottomRef} />
          </div>

          {/* ================= INPUT ================= */}
          <div className="p-3 border-t border-white/10">
            <div className="flex items-center gap-2">
              <div className="relative flex items-center gap-2 bg-[#30374f] rounded-full px-2 h-12 flex-1">
                <button
                  onClick={() => setPlusOpen((p) => !p)}
                  className="w-9 h-9 rounded-full bg-white/10"
                >
                  +
                </button>

                {plusOpen && (
                  <div className="absolute bottom-14 left-2 bg-[#1f2937] rounded-xl shadow-lg z-50">
                    <button
                      onClick={() => {
                        setPlusOpen(false);
                        fileInputRef.current?.click();
                      }}
                      className="px-4 py-2 text-sm hover:bg-white/10"
                    >
                      📷 Upload Gambar
                    </button>
                  </div>
                )}

                <input
                  ref={fileInputRef}
                  type="file"
                  hidden
                  accept="image/*"
                  onChange={(e) => {
                    const f = e.target.files?.[0];
                    if (f) handleImageUpload(f);
                  }}
                />

                <input
                  value={text}
                  onChange={(e) => setText(e.target.value)}
                  onKeyDown={(e) => e.key === "Enter" && handleSend()}
                  placeholder="Type message..."
                  className="flex-1 bg-transparent outline-none text-sm"
                />
              </div>

              <button
                onClick={handleSend}
                className="w-12 h-12 rounded-full bg-[#ff6b35]"
              >
                ➤
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* ================= IMAGE PREVIEW ================= */}
      {previewImage && (
        <div
          className="fixed inset-0 bg-black/90 flex items-center justify-center z-50"
          onClick={() => setPreviewImage(null)}
        >
          <img src={previewImage} className="max-w-[90%] max-h-[90%] rounded-xl" />
        </div>
      )}
    </>
  );
}
