"use client";

import React, { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { fetchMe } from "@/lib/auth";

const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:9002";

export default function ProfilePage() {
  const router = useRouter();
  const fileRef = useRef<HTMLInputElement | null>(null);

  const [username, setUsername] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [avatar, setAvatar] = useState<string | null>(null);
  const [preview, setPreview] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);

  // =========================
  // FETCH PROFILE
  // =========================
  useEffect(() => {
    const token = localStorage.getItem("token");
    if (!token) {
      router.push("/");
      return;
    }

    (async () => {
      const res = await fetch(`${API_URL}/api/auth/profile`, {
        headers: { Authorization: `Bearer ${token}` },
      });

      if (!res.ok) {
        router.push("/");
        return;
      }

      const data = await res.json();
      setUsername(data.user.username || "");
      setEmail(data.user.email || "");
      setPhone(data.user.phone || "");
      setAvatar(data.user.avatar || null);
    })();
  }, [router]);

  // =========================
  // SAVE PROFILE
  // =========================
  async function handleSaveProfile() {
    const token = localStorage.getItem("token");
    if (!token) return;

    setSaving(true);

    const res = await fetch(`${API_URL}/api/users/profile`, {
      method: "PUT",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify({ username, phone }),
    });

    setSaving(false);

    if (!res.ok) {
      alert("Gagal menyimpan profile");
      return;
    }

    alert("Profile berhasil disimpan");
  }

  // =========================
  // AVATAR SELECT
  // =========================
  function handleSelectAvatar(file: File) {
    if (!file.type.startsWith("image/")) return;

    const reader = new FileReader();
    reader.onload = () => setPreview(reader.result as string);
    reader.readAsDataURL(file);
  }

  // =========================
  // UPLOAD AVATAR
  // =========================
  async function handleUploadAvatar() {
  if (!fileRef.current?.files?.[0]) return;

  const token = localStorage.getItem("token");
  if (!token) return;

  setLoading(true);

  const formData = new FormData();
  formData.append("avatar", fileRef.current.files[0]);

  const res = await fetch(`${API_URL}/api/users/avatar`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${token}`,
    },
    body: formData,
  });

  if (!res.ok) {
    setLoading(false);
    alert("Gagal upload avatar");
    return;
  }

  // 🔥 ambil user terbaru
  const user = await fetchMe();

  // 🔥 update state UI
  setAvatar(user.avatar);
  setPreview(null);

  // 🔥 reset file input
  if (fileRef.current) fileRef.current.value = "";

  // 🔥 sync global
  localStorage.setItem("user", JSON.stringify(user));
  window.dispatchEvent(
    new CustomEvent("user-updated", { detail: user })
  );

  setLoading(false);
}

  return (
    <div className="min-h-screen bg-[#0f1724] text-white flex items-center justify-center">
      <div className="w-full sm:max-w-2xl bg-[#101827] rounded-2xl p-6 shadow-lg">

        {/* HEADER */}
        <div className="flex items-center justify-between mb-6">
          <h1 className="text-2xl font-semibold text-[#ff6b35]">User Profile</h1>
          <button
            onClick={() => router.push("/chat")}
            className="text-[#ff6b35] hover:opacity-80 text-sm"
          >
            ← Back to Chat
          </button>
        </div>

        <div className="flex flex-col sm:flex-row gap-8">

          {/* AVATAR */}
          <div className="flex flex-col items-center gap-3">
            <div className="w-32 h-32 rounded-full bg-[#ff6b35] flex items-center justify-center text-4xl font-bold overflow-hidden">
              {preview ? (
                <img src={preview} className="w-full h-full object-cover" />
              ) : avatar ? (
                <img src={avatar} className="w-full h-full object-cover" />
              ) : (
                username.charAt(0).toUpperCase()
              )}
            </div>

            <input
              ref={fileRef}
              type="file"
              accept="image/*"
              hidden
              onChange={(e) =>
                e.target.files && handleSelectAvatar(e.target.files[0])
              }
            />

            <button
              onClick={() => fileRef.current?.click()}
              className="px-4 py-2 rounded-lg bg-[#ff6b35]/20 text-[#ff6b35] hover:bg-[#ff6b35]/30 text-sm"
            >
              Upload
            </button>

            {preview && (
              <button
                disabled={loading}
                onClick={handleUploadAvatar}
                className="px-4 py-2 rounded-lg bg-[#ff6b35] text-black text-sm hover:opacity-90"
              >
                {loading ? "Uploading..." : "Save Avatar"}
              </button>
            )}
          </div>

          {/* FORM */}
          <div className="flex-1 space-y-4">
            <div>
              <label className="text-xs text-gray-400">Username</label>
              <input
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                className="w-full mt-1 px-4 py-2 rounded bg-[#0f1724] border border-[#ff6b35]/50 outline-none"
              />
            </div>

            <div>
              <label className="text-xs text-gray-400">Email</label>
              <input
                value={email}
                disabled
                className="w-full mt-1 px-4 py-2 rounded bg-[#0f1724] border border-[#ff6b35]/30 opacity-70 outline-none"
              />
            </div>

            <div>
              <label className="text-xs text-gray-400">Phone</label>
              <input
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                className="w-full mt-1 px-4 py-2 rounded bg-[#0f1724] border border-[#ff6b35]/50 outline-none"
              />
            </div>

            {/* SAVE */}
            <div className="mt-6 flex justify-end">
              <button
                onClick={handleSaveProfile}
                disabled={saving}
                className="w-1/2 py-3 rounded-xl bg-[#ff6b35] text-black font-semibold hover:opacity-90"
              >
                {saving ? "Saving..." : "Save Changes"}
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
