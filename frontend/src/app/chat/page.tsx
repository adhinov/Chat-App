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
  const [me, setMe] = useState<Sender | null>(null);
  const [onlineCount, setOnlineCount] = useState(0);

  const [menuOpen, setMenuOpen] = useState(false);
  const [plusOpen, setPlusOpen] = useState(false);
  const [previewImage, setPreviewImage] = useState<string | null>(null);

  const API_URL =
    process.env.NEXT_PUBLIC_API_URL || "http://localhost:9002";

  /* =========================
     INIT (AUTH + SOCKET)
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

    async function init() {
      try {
        /* ===== GET ME ===== */
        const meRes = await fetch(`${API_URL}/api/auth/me`, {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        });

        if (!meRes.ok) {
          router.push("/");
          return;
        }

        const meData: Sender = await meRes.json();
        setMe(meData);

        /* ===== SOCKET LISTENERS ===== */
        socket.on("onlineCount", setOnlineCount);

        socket.on("receive_message", (msg: Message) => {
          setMessages((prev) => {
            // replace optimistic
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

            // prevent duplicate
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
     SEND TEXT (OPTIMISTIC)
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
        sender: me,
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
      hour: "2-digit",
      minute: "2-digit",
    });
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
          <div className="flex items-center justify-between p-4 border-b border-white/10 relative">
            <div className="flex items-center gap-3">
              <button
                onClick={() => router.push("/profile")}
                className="w-10 h-10 rounded-full bg-[#2563eb] overflow-hidden flex items-center justify-center"
              >
                {me?.avatar ? (
                  <img
                    src={me.avatar}
                    className="w-full h-full object-cover"
                    alt="avatar"
                  />
                ) : (
                  <span className="font-bold">
                    {me?.username?.charAt(0)}
                  </span>
                )}
              </button>

              <div>
                <div className="font-semibold">
                  Chat Room {me && `- ${me.username}`}
                </div>
                <div className="text-xs text-gray-400">
                  Online: {onlineCount}
                </div>
              </div>
            </div>

            <button
              onClick={() => setMenuOpen((p) => !p)}
              className="w-9 h-9 rounded-full bg-white/10 flex items-center justify-center"
            >
              ⚙️
            </button>

            {menuOpen && (
              <div className="absolute right-4 top-14 bg-[#1f2937] rounded-xl overflow-hidden z-50">
                <button
                  onClick={() => {
                    setMenuOpen(false);
                    router.push("/profile");
                  }}
                  className="block px-4 py-2 hover:bg-white/10 w-full text-left"
                >
                  Edit Profile
                </button>
                <button
                  onClick={() => {
                    localStorage.removeItem("token");
                    router.push("/");
                  }}
                  className="block px-4 py-2 text-red-400 hover:bg-white/10 w-full text-left"
                >
                  Logout
                </button>
              </div>
            )}
          </div>

          {/* ================= MESSAGES ================= */}
          <div className="flex-1 overflow-y-auto px-3 py-3 space-y-3">
            {messages.map((m) => {
              const mine = isMine(m);
              return (
                <div
                  key={m.id}
                  className={`flex ${
                    mine ? "justify-end" : "justify-start"
                  }`}
                >
                  <div
                    className={`max-w-[75%] px-4 py-2 rounded-xl ${
                      mine
                        ? "bg-[#2563eb] rounded-br-none"
                        : "bg-[#1f2937] rounded-bl-none"
                    } ${m.pending ? "opacity-60 animate-pulse" : ""}`}
                  >
                    <div className="text-xs text-gray-300 mb-1">
                      {mine ? "You" : m.sender.username}
                    </div>

                    {isValidImageUrl(m.image) && (
                      <img
                        src={m.image as string}
                        onClick={() =>
                          setPreviewImage(m.image as string)
                        }
                        className="rounded-lg mb-2 max-h-60 cursor-pointer"
                        alt="message"
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

          {/* ================= INPUT ================= */}
          <div className="p-3 border-t border-white/10">
            <div className="relative flex items-center gap-2 bg-[#11172c] rounded-full px-2 h-12">
              {/* PLUS BUTTON */}
              <button
                type="button"
                onClick={() => setPlusOpen((p) => !p)}
                className="w-9 h-9 rounded-full bg-white/10 flex items-center justify-center"
              >
                +
              </button>

              {/* DROPDOWN */}
              {plusOpen && (
                <div className="absolute bottom-14 left-2 z-50 bg-[#1f2937] rounded-xl shadow-lg overflow-hidden">
                  <button
                    type="button"
                    onClick={() => {
                      setPlusOpen(false);
                      fileInputRef.current?.click();
                    }}
                    className="px-4 py-2 hover:bg-white/10 text-sm w-full text-left"
                  >
                    📷 Upload Gambar
                  </button>
                </div>
              )}

              {/* FILE INPUT */}
              <input
                ref={fileInputRef}
                type="file"
                accept="image/*"
                hidden
                onChange={(e) => {
                  const file = e.target.files?.[0];
                  if (file) handleImageUpload(file);
                }}
              />

              {/* TEXT INPUT */}
              <input
                value={text}
                onChange={(e) => setText(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && handleSend()}
                placeholder="Type message..."
                className="flex-1 bg-transparent outline-none text-sm"
              />

              {/* SEND */}
              <button
                type="button"
                onClick={handleSend}
                className="w-10 h-10 rounded-full bg-[#ff6b35] flex items-center justify-center"
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
          <img
            src={previewImage}
            className="max-w-[90%] max-h-[90%] rounded-xl"
            alt="preview"
          />
        </div>
      )}
    </>
  );
}
