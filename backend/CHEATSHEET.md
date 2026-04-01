# 📝 Neon + Prisma Cheat Sheet

## 🚀 Quick Commands

### Setup & Migration
```bash
# Generate Prisma Client
npx prisma generate

# Create migration
npx prisma migrate dev --name your_migration_name

# Apply migrations (production)
npx prisma migrate deploy

# Reset database
npx prisma migrate reset

# Open Prisma Studio (GUI)
npx prisma studio
```

### Development
```bash
# Start dev server
npm run dev

# Build for production
npm run build

# Start production server
npm start

# Test database connection
npx ts-node test-connection.ts
```

---

## 💻 Code Snippets

### Basic Query (WITHOUT Retry)
```typescript
import prisma from "./lib/prisma";

const users = await prisma.user.findMany();
```

### WITH Retry (Recommended for Neon)
```typescript
import { retryOperation } from "./lib/db-utils";
import prisma from "./lib/prisma";

const users = await retryOperation(async () => {
  return await prisma.user.findMany();
});
```

### In Controller
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
          avatar: true,
        },
      });
    });

    res.json(users);
  } catch (error) {
    console.error("Failed to fetch users:", error);
    res.status(500).json({ 
      error: "Failed to fetch users",
      message: "Database connection error"
    });
  }
}
```

### Create with Retry
```typescript
const newUser = await retryOperation(async () => {
  return await prisma.user.create({
    data: {
      email: "user@example.com",
      username: "johndoe",
      password: hashedPassword,
    },
  });
});
```

### Update with Retry
```typescript
const updatedUser = await retryOperation(async () => {
  return await prisma.user.update({
    where: { id: userId },
    data: { username: "newusername" },
  });
});
```

### Delete with Retry
```typescript
await retryOperation(async () => {
  return await prisma.messages.delete({
    where: { id: messageId },
  });
});
```

### Transaction with Retry
```typescript
const result = await retryOperation(async () => {
  return await prisma.$transaction(async (tx) => {
    const message = await tx.messages.create({
      data: { text: "Hello", senderId: 1 },
    });

    await tx.user.update({
      where: { id: 1 },
      data: { lastLogin: new Date() },
    });

    return message;
  });
});
```

### Raw SQL with Retry
```typescript
const stats = await retryOperation(async () => {
  return await prisma.$queryRaw`
    SELECT 
      u.username, 
      COUNT(m.id) as message_count
    FROM "User" u
    LEFT JOIN "Messages" m ON m."senderId" = u.id
    GROUP BY u.id, u.username
    ORDER BY message_count DESC
    LIMIT 10
  `;
});
```

---

## 🔧 Environment Variables

### Development
```bash
DATABASE_URL="postgresql://user:pass@ep-xxx.neon.tech/neondb?sslmode=require&connection_limit=3&pool_timeout=10"
NODE_ENV="development"
PORT=5000
JWT_SECRET="your-secret-key"
CORS_ORIGIN="http://localhost:3000"
```

### Production
```bash
DATABASE_URL="postgresql://user:pass@ep-xxx.neon.tech/neondb?sslmode=require&connection_limit=10&pool_timeout=20&keepalives_idle=30"
NODE_ENV="production"
PORT=5000
JWT_SECRET="your-strong-secret-key"
CORS_ORIGIN="https://yourdomain.com"
```

### Serverless (Vercel/Netlify)
```bash
DATABASE_URL="postgresql://user:pass@ep-xxx.neon.tech/neondb?sslmode=require&connection_limit=1&pool_timeout=0"
```

---

## 🔍 Debugging

### Check Database Connection
```typescript
import { checkDatabaseConnection } from "./lib/db-utils";

const isConnected = await checkDatabaseConnection();
console.log(`Database: ${isConnected ? "✅ Connected" : "❌ Disconnected"}`);
```

### Ping Database
```typescript
import { pingDatabase } from "./lib/db-utils";

await pingDatabase(); // Logs response time
```

### Manual Reconnect
```typescript
import prisma from "./lib/prisma";

await prisma.$disconnect();
await prisma.$connect();
```

---

## 🐛 Common Errors & Solutions

### Error: "terminating connection due to administrator command"
**Solution:** Already handled by retry logic! ✅

### Error: "Connection pool timeout"
**Solution:** Reduce connection_limit in DATABASE_URL
```bash
?connection_limit=3
```

### Error: "P1001: Can't reach database server"
**Solution:** 
1. Check Neon dashboard (database running?)
2. Check internet connection
3. Verify DATABASE_URL is correct

### Error: Migration fails
**Solution:** Use direct connection (without pooling)
```bash
# Temporarily use direct connection
DATABASE_URL="postgresql://...?sslmode=require" npx prisma migrate dev
```

### Query slow after idle (1-3 seconds)
**Solution:** This is normal! Neon is waking up from auto-suspend.
To prevent:
```typescript
// In server.ts
import { startNeonKeepalive } from "./middleware/neon-connection.middleware";
startNeonKeepalive(4 * 60 * 1000); // Ping every 4 minutes
```

---

## 📊 Prisma Studio

View/edit database in GUI:
```bash
npx prisma studio
```

Opens at: http://localhost:5555

---

## 🔗 Useful Links

- **Neon Console:** https://console.neon.tech
- **Prisma Docs:** https://prisma.io/docs
- **Neon Docs:** https://neon.tech/docs
- **This Project:**
  - `README-NEON.md` - Complete guide
  - `QUICK-START.md` - Quick start
  - `NEON-SETUP.md` - Detailed setup
  - `src/examples/neon-query-examples.ts` - Code examples

---

## 🎯 Best Practices Checklist

- [ ] Always use `retryOperation()` for critical queries
- [ ] Use connection pooling (already configured)
- [ ] Monitor Neon compute hours (free tier: 100 hours/month)
- [ ] Use indexes for frequently queried fields
- [ ] Never hardcode DATABASE_URL
- [ ] Use environment variables
- [ ] Test connection after deployment
- [ ] Enable error logging in production

---

## 📞 Quick Help

**Need to see all files created?**
```bash
ls -la backend/src/lib/
ls -la backend/src/middleware/
ls -la backend/src/examples/
ls -la backend/*.md
```

**Need to regenerate Prisma Client?**
```bash
npx prisma generate
```

**Need to check project structure?**
```bash
tree backend/src -I node_modules
```

---

**Happy Coding! 🚀**
