# ✅ Migration Checklist: Optimize untuk Neon

Ikuti checklist ini untuk memastikan aplikasi kamu siap production dengan Neon.

---

## 📋 Pre-Migration Checklist

- [ ] Sudah punya akun Neon ([console.neon.tech](https://console.neon.tech))
- [ ] Sudah buat project di Neon
- [ ] Sudah copy connection string (gunakan **Pooled connection**)
- [ ] Backup data lama (jika ada)

---

## 🛠️ Setup Checklist

### 1. Environment Variables

- [ ] File `.env` sudah ada di `backend/`
- [ ] `DATABASE_URL` sudah diisi dengan Neon connection string
- [ ] `DATABASE_URL` sudah include parameter:
  - [ ] `sslmode=require`
  - [ ] `connection_limit=5`
  - [ ] `pool_timeout=10`
  - [ ] `connect_timeout=10`

**Example:**
```bash
DATABASE_URL="postgresql://user:pass@ep-xxx.neon.tech/neondb?sslmode=require&connection_limit=5&pool_timeout=10&connect_timeout=10"
```

### 2. Prisma Files

- [ ] `prisma/schema.prisma` sudah updated
- [ ] `src/lib/prisma.ts` sudah updated
- [ ] `src/lib/db-utils.ts` sudah ada
- [ ] `src/middleware/neon-connection.middleware.ts` sudah ada

### 3. Server Configuration

- [ ] `src/server.ts` sudah include database initialization
- [ ] Server melakukan health check saat startup

### 4. Run Migration

```bash
cd backend
npx prisma migrate dev --name init_neon
npx prisma generate
```

- [ ] Migration berhasil tanpa error
- [ ] Prisma Client ter-generate ulang

### 5. Test Connection

```bash
npx ts-node test-connection.ts
```

- [ ] Connection test passed
- [ ] User count query berhasil

---

## 🔄 Code Migration Checklist

### Critical Queries (Harus pakai retry logic)

Cari semua query Prisma dan wrap dengan `retryOperation`:

#### Auth Controller

- [ ] `src/controllers/auth.controller.ts`
  - [ ] Login query
  - [ ] Register query
  - [ ] Verify token query

#### User Controller

- [ ] `src/controllers/user.controller.ts`
  - [ ] Get profile query
  - [ ] Update profile query
  - [ ] Get all users query

#### Message Controller

- [ ] Message queries (get, create, delete)

#### Admin Controller

- [ ] All admin queries

---

## 🧪 Testing Checklist

### Manual Testing

- [ ] Register user baru
- [ ] Login
- [ ] Send message
- [ ] Get messages
- [ ] Update profile
- [ ] Upload avatar/file

### Connection Testing

- [ ] Biarkan server idle 5+ menit
- [ ] Coba query lagi (harus auto-reconnect)
- [ ] Test retry logic dengan disconnect paksa

### Performance Testing

- [ ] First query after idle (expect 1-3s delay - normal)
- [ ] Subsequent queries (should be fast)
- [ ] Multiple concurrent requests

---

## 🚀 Production Checklist

- [ ] `NODE_ENV=production` di environment
- [ ] Connection limit optimal (5-10 untuk production)
- [ ] Error logging sudah proper
- [ ] Monitor compute hours di Neon dashboard
- [ ] Backup strategy sudah ada

---

## 📊 Monitoring

- [ ] Setup monitoring untuk database uptime
- [ ] Track query performance
- [ ] Monitor Neon compute usage
- [ ] Set alert untuk 80% compute hours

---

## ✅ Final Check

- [ ] Semua test passed
- [ ] No error di production
- [ ] Performance acceptable
- [ ] Documentation updated

**Congratulations! 🎉 Aplikasi kamu sudah production-ready dengan Neon!**
