"use client";

import React, { useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState } from "react";
import { io, Socket } from "socket.io-client";
import { useRouter } from "next/navigation";
import axios from "axios";
import EmojiPicker, { EmojiClickData, Theme } from "emoji-picker-react";

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

type MessageListProps = {
  messages: Message[];
  me: CurrentUser | null;
  getImageUrl: (imageUrl: string | null | undefined) => string | null;
  formatTime: (date: string) => string;
  onPreviewImage: (url: string) => void;
};

const MessageList = React.memo(function MessageList({
  messages,
  me,
  getImageUrl,
  formatTime,
  onPreviewImage,
}: MessageListProps) {
  return (
    <>
      {messages.map((m) => {
        const isMe = m.sender.id === me?.id;

        return (
          <div
            key={m.id}
            className={`flex ${isMe ? "justify-end" : "justify-start"}`}
          >
            {!isMe && (
              <div className="w-8 h-8 rounded-full mr-2 mt-1 flex items-center justify-center bg-[#2563eb] flex-shrink-0 overflow-hidden">
                {m.sender.avatar ? (
                  <img
                    src={getImageUrl(m.sender.avatar) || undefined}
                    className="w-full h-full object-cover"
                    alt={m.sender.username}
                  />
                ) : (
                  <span className="text-xs font-bold text-white">
                    {m.sender.username?.charAt(0).toUpperCase() || "?"}
                  </span>
                )}
              </div>
            )}

            <div
              className={`max-w-[75%] rounded-2xl px-4 py-2 text-sm ${
                isMe ? "bg-orange-500 text-black" : "bg-[#1e293b] text-white"
              }`}
            >
              <div
                className={`text-xs font-semibold mb-1 ${
                  isMe ? "text-black/70" : "text-orange-400"
                }`}
              >
                {isMe ? "You" : m.sender.username}
              </div>

              {m.image && (
                <img
                  src={getImageUrl(m.image) || undefined}
                  className="rounded-lg mb-2 max-h-60 cursor-pointer"
                  onClick={() => {
                    const url = getImageUrl(m.image);
                    if (url) onPreviewImage(url);
                  }}
                />
              )}

              {m.text && <div>{m.text}</div>}

              {m.pending && (
                <div className="text-[10px] text-white/70 italic mt-1">
                  sending...
                </div>
              )}

              <div className="text-[10px] text-right text-white/60 mt-1">
                {formatTime(m.createdAt)}
              </div>
            </div>
          </div>
        );
      })}
    </>
  );
});

/* =========================
   COMPONENT
========================= */
export default function ChatPage() {
  const router = useRouter();

  const fileInputRef = useRef<HTMLInputElement>(null);
  const socketRef = useRef<Socket | null>(null);
  const tokenRef = useRef<string>("");

  const [messages, setMessages] = useState<Message[]>([])
  const messagesEndRef = useRef<HTMLDivElement | null>(null);
  const [text, setText] = useState("");
  const [me, setMe] = useState<CurrentUser | null>(null);
  const [onlineCount, setOnlineCount] = useState(0);



  const [menuOpen, setMenuOpen] = useState(false);
  const [showPlusMenu, setShowPlusMenu] = useState(false);
  const [previewImage, setPreviewImage] = useState<string | null>(null);
  const [showEmojiPicker, setShowEmojiPicker] = useState(false);

  // 🔥 UPLOAD STATE
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [isUploading, setIsUploading] = useState(false);

  const [selectedImage, setSelectedImage] = useState<File | null>(null);
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const [imageCaption, setImageCaption] = useState("");
  const [showImageDialog, setShowImageDialog] = useState(false);
  const [showEmojiPickerCaption, setShowEmojiPickerCaption] = useState(false);

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
          // Skip jika ID sudah ada
          if (prev.some((m) => m.id === msg.id)) return prev;

          // Replace optimistic pending message if it matches
          const pendingIndex = prev.findIndex(
            (m) =>
              m.pending &&
              m.sender.id === msg.sender.id &&
              (m.text ?? "") === (msg.text ?? "") &&
              ((m.image && msg.image) || (!m.image && !msg.image))
          );
          if (pendingIndex !== -1) {
            const next = prev.slice();
            next[pendingIndex] = msg;
            return next;
          }

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

    const msgText = text;
    setText("");

    // Optimistic update
    const tempId = `temp-${Date.now()}`;
    const optimisticMsg: Message = {
      id: tempId,
      text: msgText,
      image: null,
      createdAt: new Date().toISOString(),
      sender: me,
      pending: true,
    };
    setMessages((prev) => [...prev, optimisticMsg]);
    scrollToBottom();

    try {
      const res = await fetch(`${API_URL}/api/messages`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${tokenRef.current}`,
        },
        body: JSON.stringify({ text: msgText }),
      });

      if (!res.ok) {
        throw new Error("Failed to send message");
      }
    } catch (err) {
      // Rollback optimistic message on failure
      setMessages((prev) => prev.filter((m) => m.id !== tempId));
      setText(msgText);
      console.error("Send message error:", err);
    }

    // Backend akan broadcast via socket, jadi tidak perlu optimistic update
  }

  /* =========================
     EMOJI PICKER
  ========================= */
  function handleEmojiClick(emojiData: EmojiClickData) {
    setText((prev) => prev + emojiData.emoji);
    setShowEmojiPicker(false);
  }

  function handleEmojiClickCaption(emojiData: EmojiClickData) {
    setImageCaption((prev) => prev + emojiData.emoji);
    setShowEmojiPickerCaption(false);
  }

  /* =========================
   SEND IMAGE WITH PROGRESS
  ========================= */
  async function handleImageUpload(file: File) {
    if (!me || !tokenRef.current) return;

    const preview = URL.createObjectURL(file);
    setPreviewUrl(preview);
    setIsUploading(true);
    setUploadProgress(0);
    const tempId = `temp-img-${Date.now()}`;

    // Optimistic image message (no caption)
    const optimisticMsg: Message = {
      id: tempId,
      text: null,
      image: preview,
      createdAt: new Date().toISOString(),
      sender: me,
      pending: true,
    };
    setMessages((prev) => [...prev, optimisticMsg]);
    scrollToBottom();

    try {
      const formData = new FormData();
      formData.append("image", file); // ⬅️ HARUS "image"

      await axios.post(
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

      // Backend akan broadcast message via socket
    } catch (err) {
      console.error("Upload image error:", err);
      // Rollback optimistic message on failure
      setMessages((prev) => prev.filter((m) => m.id !== tempId));
      alert("Upload gambar gagal");
    } finally {
      setIsUploading(false);
      setPreviewUrl(null);
      setUploadProgress(0);
    }
  }

  function handleSelectImage(file: File) {
    const preview = URL.createObjectURL(file);

    setSelectedImage(file);
    setImagePreview(preview);
    setImageCaption("");
    setShowImageDialog(true);
  }

  async function sendImageWithCaption() {
    if (!selectedImage || !me) return;

    setShowImageDialog(false);
    const caption = imageCaption;
    setImageCaption("");
    const preview = imagePreview || URL.createObjectURL(selectedImage);
    const tempId = `temp-img-${Date.now()}`;

    // Optimistic image message (with caption)
    const optimisticMsg: Message = {
      id: tempId,
      text: caption || null,
      image: preview,
      createdAt: new Date().toISOString(),
      sender: me,
      pending: true,
    };
    setMessages((prev) => [...prev, optimisticMsg]);
    scrollToBottom();

    try {
      const formData = new FormData();
      formData.append("image", selectedImage);
      if (caption) formData.append("text", caption);

      await axios.post(
        `${API_URL}/api/messages/upload`,
        formData,
        {
          headers: {
            Authorization: `Bearer ${tokenRef.current}`,
          },
        }
      );

      // Backend akan broadcast message via socket (termasuk caption)
    } catch (err) {
      console.error("Upload image error:", err);
      // Rollback optimistic message on failure
      setMessages((prev) => prev.filter((m) => m.id !== tempId));
      alert("Upload gambar gagal");
    } finally {
      setSelectedImage(null);
      setImagePreview(null);
    }
  }

  /* =========================
     HELPERS
  ========================= */
  function scrollToBottom() {
    setTimeout(() => {
      messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
    }, 50);
  }

  function isMine(msg: Message) {
    return msg.sender.id === me?.id;
  }

  const getImageUrl = useCallback(
    (imageUrl: string | null | undefined): string | null => {
      if (!imageUrl) return null;

      // Jika sudah full URL (Cloudinary atau https), return langsung
      if (imageUrl.startsWith("http://") || imageUrl.startsWith("https://")) {
        return imageUrl;
      }

      // Jika relative path, convert ke backend URL
      return `${API_URL}/${imageUrl}`;
    },
    [API_URL]
  );

  const formatTime = useCallback((date: string) => {
    return new Date(date).toLocaleTimeString("id-ID", {
      hour: "2-digit",
      minute: "2-digit",
    });
  }, []);

  const messageList = useMemo(
    () => (
      <MessageList
        messages={messages}
        me={me}
        getImageUrl={getImageUrl}
        formatTime={formatTime}
        onPreviewImage={(url) => setPreviewImage(url)}
      />
    ),
    [messages, me, getImageUrl, formatTime]
  );

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
    <div className="h-[100dvh] min-h-[100svh] flex justify-center bg-[#0f1724] text-white pt-[env(safe-area-inset-top)] pb-[env(safe-area-inset-bottom)] pl-[env(safe-area-inset-left)] pr-[env(safe-area-inset-right)] overflow-x-hidden">
      <div className="flex flex-col w-full max-w-full sm:max-w-xl bg-[#101827] overflow-x-hidden">

        {/* ================= HEADER ================= */}
        <div className="flex items-center justify-between px-4 pb-4 pt-[calc(1rem+env(safe-area-inset-top))] border-b border-white/10 bg-[#101827]">
          <div className="flex items-center gap-3">
            <button
              onClick={() => router.push("/profile")}
              className="w-10 h-10 rounded-full bg-[#2563eb] overflow-hidden flex items-center justify-center"
            >
              {me?.avatar ? (
                <img src={getImageUrl(me.avatar) || undefined} className="w-full h-full object-cover" />
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

              <div className="flex items-center gap-2 text-xs">
                <span className="text-green-400">● Online {onlineCount}</span>
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
              <div className="absolute right-0 mt-2 w-40 bg-[#1f2937] rounded-xl shadow-lg z-50">
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
        <div className="flex-1 overflow-y-auto overflow-x-hidden px-3 py-4 space-y-3">
          {messageList}
          <div ref={messagesEndRef} />
        </div>

        {/* ================= INPUT ================= */}
        <div className="p-3 border-t border-white/10 pb-[calc(1rem+env(safe-area-inset-bottom))] pr-[calc(0.75rem+env(safe-area-inset-right))] pl-[calc(0.75rem+env(safe-area-inset-left))] bg-[#101827] sticky bottom-0">
          <div className="flex items-center gap-2 w-full min-w-0">
            <div className="relative flex items-center gap-2 bg-[#30374f] rounded-full px-2 h-12 flex-1 min-w-0">
              <button
                onClick={() => {
                  setShowPlusMenu((p) => !p);
                  setShowEmojiPicker(false);
                }}
                className="w-9 h-9 rounded-full bg-transparent"
              >
                +
              </button>

              {showPlusMenu && (
                <div className="absolute bottom-14 left-2 bg-[#1f2937] rounded-xl shadow-lg z-50">
                  <button
                    onClick={() => {
                      setShowPlusMenu(false);
                      fileInputRef.current?.click();
                    }}
                    className="px-4 py-2 text-sm hover:bg-white/10"
                  >
                    📷 Upload Picture
                  </button>
                </div>
              )}

              <input
                ref={fileInputRef}
                type="file"
                hidden
                accept="image/*"
                onChange={(e) => {
                  const file = e.target.files?.[0];
                  if (file) handleSelectImage(file);
                }}
              />

              <input
                value={text}
                onChange={(e) => setText(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && handleSend()}
                placeholder="Type message..."
                className="flex-1 bg-transparent outline-none text-sm"
              />

              <button
                onClick={() => {
                  setShowEmojiPicker((p) => !p);
                  setShowPlusMenu(false);
                }}
                className="w-9 h-9 rounded-full bg-transparent hover:bg-white/10 flex items-center justify-center text-xl"
              >
                😊
              </button>

              {/* EMOJI PICKER */}
              {showEmojiPicker && (
                <>
                  <div
                    className="fixed inset-0 z-40"
                    onClick={() => setShowEmojiPicker(false)}
                  />
                  <div className="absolute bottom-16 right-2 z-50">
                    <EmojiPicker
                      onEmojiClick={handleEmojiClick}
                      theme={Theme.DARK}
                      width={320}
                      height={400}
                    />
                  </div>
                </>
              )}
            </div>

            <button
              onClick={handleSend}
              className="w-12 h-12 min-w-12 min-h-12 rounded-full bg-orange-500 flex items-center justify-center shrink-0"
            >
              ➤
            </button>
          </div>
        </div>
      </div>
    </div>

    {/* ================= IMAGE PREVIEW MODAL ================= */}
    {previewImage && (
      <div
        className="fixed inset-0 bg-black/90 flex items-center justify-center z-50"
        onClick={() => setPreviewImage(null)}
      >
        <img src={getImageUrl(previewImage) || undefined} className="max-w-[90%] max-h-[90%] rounded-xl" />
      </div>
    )}

    {/* ================= IMAGE CAPTION DIALOG ================= */}
    {showImageDialog && imagePreview && (
      <div className="fixed inset-0 bg-black/80 flex items-center justify-center z-50 p-4">
          <div className="bg-[#1f2937] rounded-2xl max-w-md w-full overflow-hidden pr-[env(safe-area-inset-right)] pl-[env(safe-area-inset-left)]">
          <div className="flex items-center justify-between p-4 border-b border-white/10">
            <span className="font-semibold text-white">Send Image</span>
            <button
              onClick={() => {
                setShowImageDialog(false);
                setImagePreview(null);
                setSelectedImage(null);
                setImageCaption("");
              }}
              className="text-xl hover:text-red-400"
            >
              ✕
            </button>
          </div>

          <div className="bg-black flex justify-center">
            <img src={imagePreview} className="max-h-[320px]" />
          </div>

          <div className="p-3 pb-[calc(1rem+env(safe-area-inset-bottom))]">
            <div className="relative flex gap-2 items-center w-full min-w-0">
              <div className="relative flex-1 flex items-center bg-[#1e293b] rounded-full px-4 py-2 min-w-0">
                <input
                  value={imageCaption}
                  onChange={(e) => setImageCaption(e.target.value)}
                  placeholder="Add a message..."
                  className="flex-1 bg-transparent outline-none text-sm text-white"
                />

                <button
                  onClick={() => setShowEmojiPickerCaption((p) => !p)}
                  className="w-8 h-8 rounded-full hover:bg-white/10 flex items-center justify-center text-lg ml-2"
                >
                  😊
                </button>

                {/* EMOJI PICKER FOR CAPTION */}
                {showEmojiPickerCaption && (
                  <>
                    <div
                      className="fixed inset-0 z-40"
                      onClick={() => setShowEmojiPickerCaption(false)}
                    />
                    <div className="absolute bottom-14 right-0 z-50">
                      <EmojiPicker
                        onEmojiClick={handleEmojiClickCaption}
                        theme={Theme.DARK}
                        width={300}
                        height={380}
                      />
                    </div>
                  </>
                )}
              </div>

              <button
                onClick={sendImageWithCaption}
                className="w-10 h-10 min-w-10 min-h-10 rounded-full bg-orange-500 flex items-center justify-center flex-shrink-0"
              >
                ➤
              </button>
            </div>
          </div>
        </div>
      </div>
    )}
  </>
);
}
