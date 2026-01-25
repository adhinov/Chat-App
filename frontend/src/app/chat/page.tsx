"use client";

import React, { useEffect, useRef, useState } from "react";
import { io, Socket } from "socket.io-client";
import { useRouter } from "next/navigation";
import axios from "axios";

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

type CurrentUser = {
  id: number;
  email: string;
  username: string;
  avatar?: string | null;
  role: string;
  previousLogin?: string | null;
};

/* =========================
   COMPONENT
========================= */
export default function ChatPage() {
  const router = useRouter();

  const bottomRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const socketRef = useRef<Socket | null>(null);
  const tokenRef = useRef<string>("");

  const [messages, setMessages] = useState<Message[]>([]);
  const [text, setText] = useState("");
  const [me, setMe] = useState<CurrentUser | null>(null);
  const [onlineCount, setOnlineCount] = useState(0);

  const [menuOpen, setMenuOpen] = useState(false);
  const [showPlusMenu, setShowPlusMenu] = useState(false);
  const [previewImage, setPreviewImage] = useState<string | null>(null);

  // 🔥 UPLOAD STATE
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [isUploading, setIsUploading] = useState(false);

  const API_URL =
    process.env.NEXT_PUBLIC_API_URL || "http://localhost:9002";

  /* =========================
     INIT SOCKET + AUTH
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

    const fetchMe = async () => {
      const res = await fetch(`${API_URL}/api/auth/me`, {
        headers: { Authorization: `Bearer ${tokenRef.current}` },
      });
      if (!res.ok) return router.push("/");
      setMe(await res.json());
    };

    async function init() {
      await fetchMe();

      socket.on("onlineCount", setOnlineCount);

      socket.on("receive_message", (msg: Message) => {
        setMessages((prev: Message[]) => {
          if (prev.some((m) => m.id === msg.id)) return prev;
          return [...prev, msg];
        });
        scrollToBottom();
      });

      const res = await fetch(`${API_URL}/api/messages`, {
        headers: { Authorization: `Bearer ${tokenRef.current}` },
      });
      setMessages(await res.json());
      scrollToBottom();
    }

    init();

    return () => {
      socket.disconnect();
      socketRef.current = null;
    };
  }, []);

  /* =========================
     SEND TEXT
  ========================= */
  async function handleSend() {
    if (!text.trim() || !me) return;

    const tempId = `temp-${Date.now()}`;
    const msgText = text;
    setText("");

    setMessages((prev: Message[]) => [
      ...prev,
      {
        id: tempId,
        text: msgText,
        image: null,
        createdAt: new Date().toISOString(),
        sender: { 
          id: me.id, 
          username: me.username, 
          avatar: me.avatar 
        },
        pending: true,
      },
    ]);

    scrollToBottom();

    await fetch(`${API_URL}/api/messages`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${tokenRef.current}`,
      },
      body: JSON.stringify({ text: msgText }),
    });
  }

  /* =========================
   SEND IMAGE (WITH PROGRESS)
  ========================= */
  async function handleImageUpload(file: File) {
    if (!me || !tokenRef.current) return;

    const preview = URL.createObjectURL(file);
    setPreviewUrl(preview);
    setIsUploading(true);
    setUploadProgress(0);

    try {
      const formData = new FormData();
      formData.append("image", file); // ⬅️ HARUS "image"

      const res = await axios.post(
        `${API_URL}/api/messages/upload`,
        formData,
        {
          headers: {
            Authorization: `Bearer ${tokenRef.current}`,
          },
          onUploadProgress: (e) => {
            if (!e.total) return;
            setUploadProgress(Math.round((e.loaded * 100) / e.total));
          },
        }
      );

      // ⬇️ kirim message ke socket setelah upload sukses
      socketRef.current?.emit("sendMessage", {
        image: res.data.imageUrl,
        text: "",
      });
    } catch (err) {
      console.error("Upload image error:", err);
      alert("Upload gambar gagal");
    } finally {
      setIsUploading(false);
      setPreviewUrl(null);
      setUploadProgress(0);
    }
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
    return msg.sender.id === me?.id;
  }

  function formatTime(date: string) {
    return new Date(date).toLocaleTimeString("id-ID", {
      hour: "2-digit",
      minute: "2-digit",
    });
  }

  /* =========================
     RENDER
  ========================= */
  function formatLastLogin(date?: string | null) {
    if (!date) return "-";

    const d = new Date(date);
    return d.toLocaleString("id-ID", {
      day: "2-digit",
      month: "2-digit",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  }

  function handleLogout() {
    localStorage.removeItem("token");
    router.push("/login");
  }

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
                <div className="flex flex-col sm:flex-row sm:items-center gap-0.5 sm:gap-2 text-[11px] sm:text-xs">
                  {/* Online badge */}
                  <div className="flex items-center gap-1.5">
                    <span className="relative flex h-2 w-2">
                      <span className="absolute inline-flex h-full w-full rounded-full bg-green-400 opacity-75 animate-ping" />
                      <span className="relative inline-flex h-2 w-2 rounded-full bg-green-500" />
                    </span>

                    <span className="text-yellow-100 font-semibold">
                      Online: {onlineCount}
                    </span>
                  </div>
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
                onClick={() => setMenuOpen((p: boolean) => !p)}
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
              const imageUrl =
                typeof m.image === "string" && m.image.startsWith("http")
                  ? m.image
                  : undefined;

              return (
                <div
                  key={m.id}
                  className={`flex items-start gap-2 ${
                    mine ? "justify-end" : "justify-start"
                  }`}
                >
                  {!mine && (
                    <div className="w-8 h-8 rounded-full bg-blue-600 overflow-hidden flex items-center justify-center text-xs font-bold">
                      {m.sender.avatar ? (
                        <img src={m.sender.avatar} className="w-full h-full object-cover" />
                      ) : (
                        m.sender.username[0]
                      )}
                    </div>
                  )}

                  <div
                    className={`max-w-[75%] px-4 py-2 rounded-xl ${
                      mine ? "bg-blue-600" : "bg-[#1f2937]"
                    } ${m.pending ? "opacity-60" : ""}`}
                  >
                    {/* USERNAME / YOU */}
                    <div
                      className={`text-xs font-semibold mb-1 ${
                        mine ? "text-right text-blue-300" : "text-blue-400"
                      }`}
                    >
                      {mine ? "You" : m.sender.username}
                    </div>
                    {imageUrl && (
                      <img
                        src={imageUrl}
                        onClick={() => setPreviewImage(imageUrl)}
                        className="rounded-lg mb-2 max-h-60 cursor-pointer"
                      />
                    )}

                    {m.text && <div className="text-sm">{m.text}</div>}

                    <div className="text-[10px] text-right opacity-70 mt-1">
                      {formatTime(m.createdAt)}
                    </div>
                  </div>
                </div>
              );
            })}
            <div ref={bottomRef} />
          </div>

          {/* ================= PREVIEW UPLOAD ================= */}
          {previewUrl && (
            <div className="px-3 pb-2">
              <div className="relative w-32 h-32">
                <img src={previewUrl} className="rounded-xl w-full h-full object-cover" />
                {isUploading && (
                  <div className="absolute inset-0 flex items-center justify-center bg-black/50 rounded-xl">
                    <div className="w-12 h-12 rounded-full border-4 border-white/30 border-t-white animate-spin" />
                  </div>
                )}
              </div>
            </div>
          )}

          {/* ================= INPUT ================= */}
          <div className="p-3 border-t border-white/10">
            <div className="flex items-center gap-2">
              <div className="relative">
              <button
                onClick={() => setShowPlusMenu((prev: boolean) => !prev)}
                className="w-10 h-10 rounded-full bg-[#1f2937] hover:bg-[#374151] flex items-center justify-center text-xl"
              >
                +
              </button>

              {/* DROPDOWN */}
              {showPlusMenu && (
                <div className="absolute bottom-12 left-0 bg-[#111827] border border-white/10 rounded-lg shadow-lg w-44 z-50">
                  <button
                    onClick={() => {
                      setShowPlusMenu(false);
                      fileInputRef.current?.click();
                    }}
                    className="w-full px-4 py-2 text-sm text-left hover:bg-white/10"
                  >
                    📷 Upload Picture
                  </button>
                </div>
              )}
            </div>

              <input
                value={text}
                onChange={(e) => setText(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && handleSend()}
                placeholder="Type message..."
                className="flex-1 bg-[#30374f] rounded-full px-4 h-12 outline-none text-sm"
              />

              <button
                onClick={handleSend}
                className="w-12 h-12 rounded-full bg-orange-500"
              >
                ➤
              </button>
            </div>
          </div>
        </div>
      </div>
      <input
        ref={fileInputRef}
        type="file"
        accept="image/*"
        hidden
        onChange={(e) => {
          const file = e.target.files?.[0];
          if (!file) return;
          handleImageUpload(file);
          e.target.value = ""; // reset biar bisa upload file sama lagi
        }}
      />

      {/* ================= IMAGE MODAL ================= */}
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
