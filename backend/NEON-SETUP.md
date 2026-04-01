# 🚀 Neon + Prisma Setup Guide

This guide shows you how to use Neon PostgreSQL with Prisma in your Chat App.

## 📋 Table of Contents

- [What is Neon?](#what-is-neon)
- [Why Use Neon + Prisma Together?](#why-use-neon--prisma-together)
- [Setup Instructions](#setup-instructions)
- [Configuration](#configuration)
- [Usage Examples](#usage-examples)
- [Common Issues & Solutions](#common-issues--solutions)
- [Best Practices](#best-practices)

---

## 🤔 What is Neon?

**Neon** is a serverless PostgreSQL database provider with:
- ✅ Auto-scaling
- ✅ Auto-suspend (saves compute hours)
- ✅ Instant branching
- ✅ Generous free tier

**Free Tier Includes:**
- 0.5 GB storage
- 100 hours compute/month
- 100 concurrent connections
- Auto-suspend after 5 minutes idle

---

## 🔗 Why Use Neon + Prisma Together?

| Technology | Role | Why? |
|------------|------|------|
| **Neon** | Database Provider | Hosts your PostgreSQL database |
| **Prisma** | ORM (Object-Relational Mapping) | Makes database queries type-safe and easy |

**They work together, NOT as alternatives!**

```
Your App (TypeScript)
    ↓
Prisma ORM (Type-safe queries)
    ↓
Neon PostgreSQL (Database storage)
```

---

## 🛠️ Setup Instructions

### 1️⃣ Create Neon Database

1. Go to [console.neon.tech](https://console.neon.tech)
2. Create a new project
3. Copy the **Pooled connection** string

### 2️⃣ Configure Environment Variables

Create `.env` file in `backend/` directory:

```bash
# Copy from Neon dashboard (use Pooled connection)
DATABASE_URL="postgresql://user:password@ep-xxx.region.aws.neon.tech/neondb?sslmode=require&connection_limit=5&pool_timeout=10&connect_timeout=10"

# Optional: Direct connection for migrations
DIRECT_DATABASE_URL="postgresql://user:password@ep-xxx.region.aws.neon.tech/neondb?sslmode=require"

NODE_ENV="development"
PORT=5000
JWT_SECRET="your-secret-key"
CORS_ORIGIN="http://localhost:3000"
```

### 3️⃣ Install Dependencies

```bash
cd backend
npm install
```

### 4️⃣ Run Migrations

```bash
npx prisma migrate dev
```

### 5️⃣ Generate Prisma Client

```bash
npx prisma generate
```

### 6️⃣ Start Server

```bash
npm run dev
```

---

## ⚙️ Configuration

### DATABASE_URL Parameters Explained

```
postgresql://user:password@host/db?param1=value1&param2=value2
```

| Parameter | Value | Description |
|-----------|-------|-------------|
| `sslmode` | `require` | Required by Neon |
| `connection_limit` | `5` | Max connections (adjust based on needs) |
| `pool_timeout` | `10` | Wait time for connection (seconds) |
| `connect_timeout` | `10` | Initial connection timeout (seconds) |
| `keepalives_idle` | `30` | Keep connection alive (prevents auto-suspend) |

### Recommended Configurations

**Development:**
```
DATABASE_URL="postgresql://...?sslmode=require&connection_limit=3"
```

**Production (High Traffic):**
```
DATABASE_URL="postgresql://...?sslmode=require&connection_limit=10&pool_timeout=20"
```

**Serverless (Vercel/Netlify):**
```
DATABASE_URL="postgresql://...?sslmode=require&connection_limit=1&pool_timeout=0"
```

---

## 💻 Usage Examples

### Basic Query (Without Retry)

```typescript
import prisma from "./lib/prisma";

const users = await prisma.user.findMany();
```

### With Retry Logic (Recommended for Neon)

```typescript
import { retryOperation } from "./lib/db-utils";
import prisma from "./lib/prisma";

const users = await retryOperation(async () => {
  return await prisma.user.findMany();
});
```

### In Express Controller

```typescript
import { Request, Response } from "express";
import { retryOperation } from "../lib/db-utils";
import prisma from "../lib/prisma";

export async function getUsers(req: Request, res: Response) {
  try {
    const users = await retryOperation(async () => {
      return await prisma.user.findMany({
        select: {
          id: true,
          username: true,
          email: true,
        },
      });
    });

    res.json(users);
  } catch (error) {
    res.status(500).json({ 
      error: "Failed to fetch users" 
    });
  }
}
```

### More Examples

See `src/examples/neon-query-examples.ts` for comprehensive examples including:
- Transactions
- Pagination
- Raw SQL queries
- Batch operations

---

## 🐛 Common Issues & Solutions

### Issue 1: "terminating connection due to administrator command"

**Cause:** Neon auto-suspends after 5 minutes of inactivity

**Solution:** Use retry logic (already implemented)

```typescript
import { retryOperation } from "./lib/db-utils";
```

### Issue 2: First query after idle is slow (1-3 seconds)

**Cause:** Neon database is waking up from auto-suspend

**Solutions:**
1. Use retry logic (handles this automatically)
2. Enable keepalive pinging:

```typescript
// In server.ts
import { startNeonKeepalive } from "./middleware/neon-connection.middleware";

// Ping every 4 minutes to prevent auto-suspend
startNeonKeepalive(4 * 60 * 1000);
```

### Issue 3: "Connection pool timeout"

**Cause:** Too many concurrent connections

**Solution:** Reduce `connection_limit` in DATABASE_URL:

```
?connection_limit=3
```

### Issue 4: Migrations fail

**Cause:** Using pooled connection for migrations

**Solution:** Use direct connection:

```bash
DATABASE_URL="postgresql://...?sslmode=require" npx prisma migrate dev
```

Or set `DIRECT_DATABASE_URL` in `.env`.

---

## ✅ Best Practices

### 1. Always Use Retry Logic for Critical Operations

```typescript
// ❌ Bad
const user = await prisma.user.findUnique({ where: { id: 1 } });

// ✅ Good
const user = await retryOperation(async () => {
  return await prisma.user.findUnique({ where: { id: 1 } });
});
```

### 2. Monitor Your Compute Hours

- Check usage at [console.neon.tech](https://console.neon.tech)
- Free tier: 100 hours/month
- Upgrade if you hit the limit

### 3. Use Indexes for Better Performance

```prisma
model Messages {
  id        Int      @id @default(autoincrement())
  senderId  Int
  createdAt DateTime @default(now())
  
  @@index([senderId])
  @@index([createdAt])
}
```

### 4. Don't Hardcode Sensitive Data

```typescript
// ❌ Bad
const dbUrl = "postgresql://user:password@host/db";

// ✅ Good
const dbUrl = process.env.DATABASE_URL;
```

### 5. Use Connection Pooling

Already configured in `prisma.ts` - nothing to do!

### 6. Close Connections Gracefully

Already configured in `prisma.ts` - handles SIGTERM, SIGINT

---

## 📊 Monitoring

### Check Database Health

```typescript
import { checkDatabaseConnection } from "./lib/db-utils";

const isHealthy = await checkDatabaseConnection();
console.log(`Database: ${isHealthy ? "✅ Healthy" : "❌ Down"}`);
```

### Ping Database

```typescript
import { pingDatabase } from "./lib/db-utils";

await pingDatabase(); // Logs response time
```

---

## 🆘 Need Help?

1. Check Neon docs: [neon.tech/docs](https://neon.tech/docs)
2. Check Prisma docs: [prisma.io/docs](https://prisma.io/docs)
3. Check this project's examples: `src/examples/neon-query-examples.ts`

---

## 📝 Summary

✅ Neon provides the **database** (PostgreSQL hosting)  
✅ Prisma provides the **ORM** (type-safe queries)  
✅ They work **together**, not as alternatives  
✅ Use **retry logic** for production reliability  
✅ Monitor your **compute hours** on free tier  
✅ Use **pooled connections** for best performance  

**You're all set! 🎉**
