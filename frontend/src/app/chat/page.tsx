"use client";

import React, { useEffect, useRef, useState } from "react";
import { io, Socket } from "socket.io-client";
import { useRouter } from "next/navigation";
import Link from "next/link";

// =========================
// TYPES
// =========================
type Sender = {
  id: number;
  username: string;
  email?: string;
  avatar?: string | null;
};

type Message = {
  id: number | string; // string untuk tempId
  text: string | null;
  image?: string | null;
  createdAt: string;
  sender: Sender;
  pending?: boolean; // 🔥 indikator kirim
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

  // 🔥 IMAGE PREVIEW (WHATSAPP STYLE)
  const [previewImage, setPreviewImage] = useState<string | null>(null);

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
          avatar: data.user.avatar || null,
        });

        s.on("onlineCount", setOnlineCount);

        s.on("receive_message", (msg: Message) => {
        setMessages((prev) => {
          // cari optimistic message
          const idx = prev.findIndex(
            (m) =>
              m.pending &&
              m.text === msg.text &&
              m.sender.id === msg.sender.id
          );

          if (idx !== -1) {
            const updated = [...prev];
            updated[idx] = msg;
            return updated;
          }

          // fallback
          if (prev.some((m) => m.id === msg.id)) return prev;

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
    if (!text.trim() || !me) return;

    const tempId = `temp-${Date.now()}`;

    // 🔥 optimistic message
    const optimisticMsg: Message = {
      id: tempId,
      text,
      image: null,
      createdAt: new Date().toISOString(),
      sender: me,
      pending: true,
    };

    setMessages((prev) => [...prev, optimisticMsg]);
    setText("");
    scrollToBottom();

    try {
      const res = await fetch(`${API_URL}/api/messages`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${localStorage.getItem("token")}`,
        },
        body: JSON.stringify({ text }),
      });

      if (!res.ok) throw new Error("Failed");

      const realMsg: Message = await res.json();

      // 🔥 replace temp message with real one
      setMessages((prev) =>
        prev.map((m) => (m.id === tempId ? realMsg : m))
      );
    } catch (err) {
      console.error(err);

      // ❌ gagal → hapus bubble
      setMessages((prev) => prev.filter((m) => m.id !== tempId));
    }
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

  function isValidImageUrl(url?: string | null) {
  if (!url) return false;
  return url.startsWith("http://") || url.startsWith("https://");
  }

  // =========================
  // RENDER
  // =========================
  return (
    <>
      <div className="h-[100dvh] flex justify-center bg-[#0f1724] text-white">
        <div className="flex flex-col w-full sm:max-w-xl bg-[#101827]">

          {/* HEADER */}
            <div className="flex items-center justify-between p-4 border-b border-white/10 relative">
              {/* LEFT: AVATAR + TITLE */}
              <div className="flex items-center gap-3">
                {/* AVATAR */}
                <button
                  onClick={() => router.push("/profile")}
                  className="w-10 h-10 rounded-full bg-[#2563eb] flex items-center justify-center text-sm font-semibold uppercase overflow-hidden"
                  title="Edit Profile"
                >
                  {me?.avatar ? (
                    <img
                      src={me.avatar}
                      alt="avatar"
                      className="w-full h-full object-cover"
                    />
                  ) : (
                    me?.username?.charAt(0)
                  )}
                </button>

                {/* TITLE */}
                <div>
                  <div className="font-semibold leading-tight">
                    Chat Room {me && `- ${me.username}`}
                  </div>
                  <div className="text-xs text-gray-400">
                    Online: {onlineCount}
                  </div>
                </div>
              </div>

              {/* RIGHT: SETTINGS */}
              <button
                onClick={() => setMenuOpen((p) => !p)}
                className="w-9 aspect-square rounded-full bg-white/10 flex items-center justify-center"
              >
                ⚙️
              </button>

              {menuOpen && (
                <div className="absolute right-4 top-14 bg-[#1f2937] rounded-xl shadow-lg overflow-hidden text-sm z-50">
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
                    {isValidImageUrl(m.image) && (
                      <img
                        src={m.image!}
                        alt="upload"
                        loading="lazy"
                        onClick={() => setPreviewImage(m.image!)}
                        className="rounded-lg mb-2 max-h-60 cursor-pointer hover:opacity-90"
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

      {/* =========================
          IMAGE PREVIEW MODAL
      ========================= */}
      {previewImage && (
        <div
          className="fixed inset-0 z-50 bg-black/90 flex items-center justify-center"
          onClick={() => setPreviewImage(null)}
        >
          <img
            src={previewImage}
            alt="preview"
            className="max-w-[90%] max-h-[90%] rounded-xl"
          />
        </div>
      )}
    </>
  );
}
