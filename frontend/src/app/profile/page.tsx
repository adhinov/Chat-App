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
  const [toast, setToast] = useState<string | null>(null);

  const [fieldError, setFieldError] = useState<{
    username?: string;
    phone?: string;
  } | null>(null);

  /* =========================
     FETCH PROFILE
  ========================= */
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

  /* =========================
     SAVE PROFILE
  ========================= */
  async function handleSaveProfile() {
    const token = localStorage.getItem("token");
    if (!token) return;

    setSaving(true);
    setFieldError(null);

    try {
      const res = await fetch(`${API_URL}/api/users/profile`, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ username, phone }),
      });

      const data = await res.json();

      if (!res.ok) {
        if (data?.error === "USERNAME_EXISTS") {
          setFieldError({ username: "Username sudah digunakan" });
          return;
        }

        if (data?.error === "PHONE_EXISTS") {
          setFieldError({ phone: "Nomor sudah terdaftar" });
          return;
        }

        throw new Error(data?.message || "Gagal menyimpan profile");
      }

      // 🔄 sync user terbaru
      const user = await fetchMe();
      localStorage.setItem("user", JSON.stringify(user));
      window.dispatchEvent(
        new CustomEvent("user-updated", { detail: user })
      );

      setToast("Profile updated");
      setTimeout(() => setToast(null), 2500);
    } catch (err: any) {
      setToast(err.message || "Update failed");
      setTimeout(() => setToast(null), 2500);
    } finally {
      setSaving(false);
    }
  }

  /* =========================
     AVATAR SELECT
  ========================= */
  function handleSelectAvatar(file: File) {
    if (!file.type.startsWith("image/")) return;

    const reader = new FileReader();
    reader.onload = () => setPreview(reader.result as string);
    reader.readAsDataURL(file);
  }

  /* =========================
     UPLOAD AVATAR
  ========================= */
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
      setToast("Gagal upload avatar");
      setTimeout(() => setToast(null), 2500);
      return;
    }

    const user = await fetchMe();

    setAvatar(user.avatar);
    setPreview(null);

    if (fileRef.current) fileRef.current.value = "";

    localStorage.setItem("user", JSON.stringify(user));
    window.dispatchEvent(
      new CustomEvent("user-updated", { detail: user })
    );

    setToast("Avatar updated");
    setTimeout(() => setToast(null), 2500);

    setLoading(false);
  }

  return (
    <div className="min-h-screen bg-[#0f1724] text-white flex items-center justify-center">
      <div className="w-full sm:max-w-2xl bg-[#101827] rounded-2xl p-6 shadow-lg">
        {/* HEADER */}
        <div className="flex items-center justify-between mb-6">
          <h1 className="text-2xl font-semibold text-[#ff6b35]">
            User Profile
          </h1>
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
              disabled={loading}
              onClick={() => fileRef.current?.click()}
              className={`px-4 py-2 rounded-lg text-sm transition
                ${
                  loading
                    ? "bg-gray-500/30 text-gray-400 cursor-not-allowed"
                    : "bg-[#ff6b35]/20 text-[#ff6b35] hover:bg-[#ff6b35]/30"
                }`}
            >
              Upload
            </button>

            {preview && (
              <button
                disabled={loading}
                onClick={handleUploadAvatar}
                className={`px-4 py-2 rounded-lg text-sm transition
                  ${
                    loading
                      ? "bg-gray-400 text-black cursor-not-allowed"
                      : "bg-[#ff6b35] text-black hover:opacity-90"
                  }`}
              >
                {loading ? "Uploading..." : "Save Avatar"}
              </button>
            )}
          </div>

          {/* FORM */}
          <div className="flex-1 space-y-4">
            {/* USERNAME */}
            <div>
              <label className="text-xs text-gray-400">Username</label>
              <input
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                className={`w-full mt-1 px-4 py-2 rounded bg-[#0f1724] outline-none
                  ${
                    fieldError?.username
                      ? "border border-red-500"
                      : "border border-[#ff6b35]/50"
                  }`}
              />
              {fieldError?.username && (
                <p className="text-xs text-red-400 mt-1">
                  {fieldError.username}
                </p>
              )}
            </div>

            {/* EMAIL */}
            <div>
              <label className="text-xs text-gray-400">Email</label>
              <input
                value={email}
                disabled
                className="w-full mt-1 px-4 py-2 rounded bg-[#0f1724] border border-[#ff6b35]/30 opacity-70 outline-none"
              />
            </div>

            {/* PHONE */}
            <div>
              <label className="text-xs text-gray-400">Phone</label>
              <input
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                className={`w-full mt-1 px-4 py-2 rounded bg-[#0f1724] outline-none
                  ${
                    fieldError?.phone
                      ? "border border-red-500"
                      : "border border-[#ff6b35]/50"
                  }`}
              />
              {fieldError?.phone && (
                <p className="text-xs text-red-400 mt-1">
                  {fieldError.phone}
                </p>
              )}
            </div>

            {/* SAVE */}
            <div className="mt-6 flex justify-end">
              <button
                onClick={handleSaveProfile}
                disabled={saving}
                className="w-1/2 py-3 rounded-xl bg-[#ff6b35] text-black font-semibold hover:opacity-90 disabled:opacity-60"
              >
                {saving ? "Saving..." : "Save Changes"}
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* TOAST */}
      {toast && (
        <div className="fixed bottom-6 right-6 z-50 px-4 py-3 rounded-xl bg-[#ff6b35] text-black text-sm shadow-lg animate-fade-in">
          {toast}
        </div>
      )}
    </div>
  );
}
