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
  id?: number;
  // sender can be string (old) or object (relation) depending on backend
  sender?: string | { id?: number; username?: string; email?: string };
  text?: string | null;
  fileUrl?: string | null;
  fileType?: string | null;
  fileName?: string | null;
  fileSize?: number | null;
  createdAt?: string;
};

// simple JWT decode (no validation) just to read payload fields
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
  const [onlineCount, setOnlineCount] = useState<number>(1);

  const [text, setText] = useState("");
  const [messages, setMessages] = useState<Message[]>([]);

  const scrollRef = useRef<HTMLDivElement | null>(null);
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  const API_URL =
    typeof window !== "undefined" && process.env.NEXT_PUBLIC_API_URL
      ? process.env.NEXT_PUBLIC_API_URL
      : typeof window !== "undefined"
      ? window.location.origin
      : "http://localhost:9002";

  // init socket + load user + fetch messages
  useEffect(() => {
    const token = localStorage.getItem("token");
    const payload = decodeToken(token);

    if (!payload) {
      router.push("/");
      return;
    }

    const name = (payload.username as string) || (payload.name as string) || (payload.email as string) || "User";
    setUsername(name);

    // socket connect (use full API_URL)
    const s = io(API_URL, {
      transports: ["websocket"],
      withCredentials: true,
      autoConnect: true,
    });

    setSocket(s);

    s.on("connect_error", (err) => {
      console.warn("Socket connect_error", err);
    });

    s.on("connect", () => {
      // emit user-online when connected (server expects user id)
      const tokenNow = localStorage.getItem("token");
      const payloadNow = decodeToken(tokenNow);
      if (payloadNow?.id) s.emit("user-online", payloadNow.id);
    });

    // incoming message from server
    s.on("receive_message", (data: any) => {
      const normalized = normalizeMessageFromServer(data);
      setMessages((prev) => [...prev, normalized]);
      // scroll to bottom
      setTimeout(() => scrollRef.current?.scrollIntoView({ behavior: "smooth" }), 20);
    });

    // online count
    s.on("onlineCount", (count: number) => {
      setOnlineCount(count);
    });

    // initial load
    fetchMessages();

    return () => {
      s.off("connect");
      s.off("receive_message");
      s.off("onlineCount");
      s.disconnect();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // normalize various server message shapes to our Message type
  function normalizeMessageFromServer(m: any): Message {
    // possible shapes:
    // { id, senderId, text, fileUrl, fileType, fileName, fileSize, createdAt, sender: { username } }
    // or older: { id, sender: "Name", message: "..." , created_at }
    const sender =
      m.sender && typeof m.sender === "object"
        ? m.sender
        : m.sender || m.senderName || m.sender_id || m.senderId || null;

    const textVal = m.text ?? m.message ?? null;
    const fileUrl = m.fileUrl ?? m.file_url ?? m.file_url ?? null;
    const createdAt = m.createdAt ?? m.created_at ?? m.created_at ?? m.created_at ?? null;

    return {
      id: m.id,
      sender,
      text: textVal,
      fileUrl,
      fileType: m.fileType ?? m.file_type ?? null,
      fileName: m.fileName ?? m.file_name ?? null,
      fileSize: m.fileSize ?? m.file_size ?? null,
      createdAt,
    };
  }

  // fetch messages with Authorization header
  async function fetchMessages() {
    try {
      const token = localStorage.getItem("token");
      if (!token) {
        router.push("/");
        return;
      }

      const res = await fetch(`${API_URL}/api/messages`, {
        method: "GET",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
      });

      if (!res.ok) {
        console.error("Fetch messages failed:", res.status, await res.text());
        return;
      }

      const data = await res.json();

      if (!Array.isArray(data)) {
        console.error("Fetch messages: unexpected payload", data);
        return;
      }

      const normalized = data.map((m: any) => normalizeMessageFromServer(m));
      setMessages(normalized);

      setTimeout(() => {
        scrollRef.current?.scrollIntoView({ behavior: "smooth" });
      }, 60);
    } catch (err) {
      console.error("Fetch messages error:", err);
    }
  }

  // send text message (use backend that reads req.user from verifyToken)
  async function handleSend() {
    if (!text.trim() || !socket) return;

    const token = localStorage.getItem("token");
    if (!token) {
      router.push("/");
      return;
    }

    try {
      const res = await fetch(`${API_URL}/api/messages`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ text }),
      });

      if (!res.ok) {
        const errText = await res.text();
        console.error("Send message failed:", res.status, errText);
        return;
      }

      const saved = await res.json();
      const msg = normalizeMessageFromServer(saved);

      // emit realtime (server also may broadcast, but we emit to keep UI snappy)
      socket.emit("send_message", msg);

      setText("");
    } catch (err) {
      console.error("Send message error:", err);
    }
  }

  // upload file handler
  async function handleFileUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;

    const token = localStorage.getItem("token");
    if (!token) {
      router.push("/");
      return;
    }

    const form = new FormData();
    form.append("file", file);

    try {
      const res = await fetch(`${API_URL}/api/messages/upload`, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${token}`,
        },
        body: form,
      });

      if (!res.ok) {
        const txt = await res.text();
        console.error("Upload failed:", res.status, txt);
        return;
      }

      const saved = await res.json();
      const msg = normalizeMessageFromServer(saved);

      // emit for realtime
      socket?.emit("send_message", msg);

      // push to local UI
      setMessages((prev) => [...prev, msg]);

      // reset input so same file can be picked again
      if (fileInputRef.current) fileInputRef.current.value = "";
      setTimeout(() => scrollRef.current?.scrollIntoView({ behavior: "smooth" }), 20);
    } catch (err) {
      console.error("Upload error:", err);
    }
  }

  // helper to get sender name string for display
  function getSenderName(s: string | { id?: number; username?: string; email?: string } | undefined) {
    if (!s) return "Unknown";
    if (typeof s === "string") return s;
    return s.username || s.email || `User#${s.id ?? "?"}`;
  }

  return (
    <div className="h-[100dvh] w-full bg-[#0f1724] text-white flex flex-col overflow-hidden">
      <div className="flex flex-col w-full h-full sm:max-w-xl sm:mx-auto sm:h-[92vh] sm:mt-4 
                      bg-[#101827] sm:rounded-xl border border-[#1f2937] shadow-xl overflow-hidden">

        {/* HEADER */}
        <div className="flex items-center justify-between p-4 border-b border-[#1f2937] bg-[#101827] sticky top-0 z-10">
          <div className="flex items-center gap-3">
            <div className="h-10 w-10 rounded-full bg-green-500 flex items-center justify-center font-bold">
              {username?.[0]?.toUpperCase()}
            </div>
            <div>
              <div className="font-semibold">{username}</div>
              <div className="text-xs text-gray-300">
                Online • {onlineCount} User{onlineCount > 1 ? "s" : ""}
              </div>
            </div>
          </div>

          <DropdownMenu>
            <DropdownMenuTrigger className="text-xl px-3 py-1 rounded hover:bg-[#1f2937]">
              ⚙
            </DropdownMenuTrigger>
            <DropdownMenuContent className="bg-[#0f1724] text-white border border-[#23303b]">
              <DropdownMenuItem
                className="hover:bg-[#1f2937]"
                onClick={() => router.push("/profile")}
              >
                Profile
              </DropdownMenuItem>

              <DropdownMenuItem
                className="hover:bg-red-600"
                onClick={() => {
                  localStorage.removeItem("token");
                  router.push("/");
                }}
              >
                Logout
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>

        {/* MESSAGES */}
        <div className="flex-1 overflow-y-auto px-3 py-3">
          <div className="space-y-3">
            {messages.map((m) => {
              const isMe = (() => {
                const token = localStorage.getItem("token");
                const payload = decodeToken(token);
                const myName = payload?.username || payload?.name || payload?.email;
                // compare by username/email or sender object
                if (typeof m.sender === "string") return m.sender === myName;
                if (!m.sender) return false;
                return (m.sender.username && m.sender.username === myName) || (m.sender.email && m.sender.email === myName);
              })();

              return (
                <div key={m.id ?? Math.random()} className={`flex ${isMe ? "justify-end" : "justify-start"}`}>
                  <div
                    className={`px-4 py-2 rounded-xl max-w-[80%] break-words ${
                      isMe ? "bg-[#2a4365]" : "bg-[#1f2937]"
                    }`}
                  >
                    <div className="text-xs text-gray-300">
                      {isMe ? "You" : getSenderName(m.sender)}
                    </div>

                    {/* file or text */}
                    {m.fileUrl ? (
                      // image preview for common image types, otherwise show download link
                      m.fileType && m.fileType.startsWith("image/") ? (
                        <img
                          src={`${API_URL}${m.fileUrl}`}
                          alt={m.fileName ?? "uploaded"}
                          className="mt-1 rounded-lg max-w-[200px] border border-white/10"
                        />
                      ) : (
                        <div className="mt-1">
                          <a
                            href={`${API_URL}${m.fileUrl}`}
                            target="_blank"
                            rel="noreferrer"
                            className="underline text-sm"
                          >
                            {m.fileName ?? "Download file"}
                          </a>
                        </div>
                      )
                    ) : (
                      <div className="mt-1 text-sm">{m.text}</div>
                    )}

                    <div className="mt-1 text-[10px] text-gray-500">
                      {(() => {
                        const date = m.createdAt ? new Date(m.createdAt) : new Date();
                        return date.toLocaleTimeString([], {
                          hour: "2-digit",
                          minute: "2-digit",
                        });
                      })()}
                    </div>
                  </div>
                </div>
              );
            })}
            <div ref={scrollRef} />
          </div>
        </div>

        {/* INPUT */}
        <div className="w-full px-3 py-3 bg-[#0a0f24] border-t border-white/5 flex items-center gap-3">
          <input
            type="file"
            ref={fileInputRef}
            className="hidden"
            onChange={handleFileUpload}
          />

          <div className="flex items-center bg-[#11172c] rounded-full px-3 flex-1 h-12">
            <button
              onClick={() => fileInputRef.current?.click()}
              className="text-white/70 hover:text-white mr-2"
            >
              +
            </button>

            <input
              type="text"
              value={text}
              onChange={(e) => setText(e.target.value)}
              placeholder="Type your message..."
              className="flex-1 bg-transparent text-white px-2 outline-none text-[15px] placeholder-white/40"
              onKeyDown={(e) => e.key === "Enter" && handleSend()}
            />
          </div>

          <button
            onClick={handleSend}
            className="h-12 w-12 flex items-center justify-center rounded-full bg-[#ff6b35] hover:bg-[#e85b2b] text-white active:scale-95 transition"
          >
            <svg
              xmlns="http://www.w3.org/2000/svg"
              width="22"
              height="22"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              viewBox="0 0 24 24"
            >
              <path d="M22 2 11 13"></path>
              <path d="M22 2 15 22 11 13 2 9 22 2z"></path>
            </svg>
          </button>
        </div>

      </div>
    </div>
  );
}
