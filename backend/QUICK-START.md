# ⚡ Quick Start: Neon + Prisma

## 🎯 TL;DR

**Neon ≠ Pengganti Prisma!**

- **Neon** = Database hosting (seperti hotel)
- **Prisma** = Tool untuk akses database (seperti kunci kamar)

Keduanya **harus dipakai bersama**! ✅

---

## 🚀 Setup 3 Langkah

### 1️⃣ Setup .env

```bash
# Ambil dari: https://console.neon.tech
DATABASE_URL="postgresql://user:pass@ep-xxx.neon.tech/neondb?sslmode=require&connection_limit=5&pool_timeout=10"
```

### 2️⃣ Run Migration

```bash
cd backend
npx prisma migrate dev
npx prisma generate
```

### 3️⃣ Start Server

```bash
npm run dev
```

✅ Done! Database siap dipakai.

---

## 📝 Cara Pakai di Code

### ❌ JANGAN (tanpa retry):

```typescript
const users = await prisma.user.findMany();
```

### ✅ PAKAI INI (dengan retry):

```typescript
import { retryOperation } from "./lib/db-utils";

const users = await retryOperation(async () => {
  return await prisma.user.findMany();
});
```

---

## 🔥 Kenapa Butuh Retry Logic?

Neon auto-suspend setelah 5 menit idle → query pertama setelah wake-up bisa **gagal**.

**Retry logic** akan otomatis:
1. Deteksi connection error
2. Reconnect ke Neon
3. Retry query (max 3x)

---

## 📊 File Penting

| File | Fungsi |
|------|--------|
| `src/lib/prisma.ts` | Prisma Client dengan auto-reconnect |
| `src/lib/db-utils.ts` | Retry logic untuk Neon |
| `src/examples/neon-query-examples.ts` | Contoh lengkap |
| `NEON-SETUP.md` | Dokumentasi lengkap |

---

## 🆘 Troubleshooting

| Error | Solusi |
|-------|--------|
| "terminating connection" | ✅ Sudah di-handle otomatis dengan retry logic |
| "pool timeout" | Kurangi `connection_limit` jadi `3` |
| Migration gagal | Pakai `DIRECT_DATABASE_URL` (tanpa pooling) |
| Query pertama lambat | Normal! Neon sedang wake-up (1-3 detik) |

---

## 💡 Alternatif Tanpa Prisma?

Kalau **BENAR-BENAR** mau lepas dari Prisma, bisa pakai:

### Opsi 1: Raw SQL dengan `pg` library

```typescript
import { Pool } from 'pg';

const pool = new Pool({
  connectionString: process.env.DATABASE_URL
});

const result = await pool.query('SELECT * FROM "User"');
```

**Cons:**
- ❌ Tidak ada type safety
- ❌ Harus tulis SQL manual
- ❌ Migration manual
- ❌ Rawan SQL injection

### Opsi 2: Drizzle ORM

```typescript
import { drizzle } from 'drizzle-orm/postgres-js';

const db = drizzle(process.env.DATABASE_URL);
const users = await db.select().from(usersTable);
```

**Cons:**
- ❌ Harus refactor semua code
- ❌ Learning curve baru

---

## 🎯 REKOMENDASI

**Tetap pakai Neon + Prisma** dengan setup yang sudah saya buat! ✅

Kenapa?
1. ✅ Type-safe
2. ✅ Auto-completion
3. ✅ Migration management
4. ✅ Retry logic sudah di-handle
5. ✅ Production-ready

---

## 📞 Need More Help?

Baca: `NEON-SETUP.md` untuk dokumentasi lengkap
