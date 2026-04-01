# 🚀 RAM Optimization Guide for Development

## 📊 Current Problem

**Symptom:** RAM usage 98% when running:
- ✅ Zed Editor
- ✅ Backend server (Node.js + Express)
- ✅ Frontend server (Next.js)
- ✅ Browser (localhost:3000)
- ✅ 2 Terminal windows

**Root Cause:** Next.js dev mode is extremely RAM-hungry (2-3GB alone!)

---

## 💡 Quick Fixes (Apply These First!)

### 1️⃣ Limit Node.js Memory Usage

#### Frontend (Next.js)

Edit `frontend/package.json`:

```json
{
  "scripts": {
    "dev": "cross-env NODE_OPTIONS=\"--max-old-space-size=512\" next dev --turbopack -p 3000",
    "dev:light": "cross-env NODE_OPTIONS=\"--max-old-space-size=384\" next dev --turbopack -p 3000",
    "build": "next build",
    "start": "next start"
  }
}
```

**For Windows (without cross-env):**

```json
{
  "scripts": {
    "dev": "set NODE_OPTIONS=--max-old-space-size=512&& next dev --turbopack -p 3000",
    "dev:light": "set NODE_OPTIONS=--max-old-space-size=384&& next dev --turbopack -p 3000"
  }
}
```

#### Backend (Express)

Edit `backend/package.json`:

```json
{
  "scripts": {
    "dev": "cross-env NODE_OPTIONS=\"--max-old-space-size=256\" ts-node-dev --respawn --transpile-only src/server.ts",
    "dev:light": "cross-env NODE_OPTIONS=\"--max-old-space-size=192\" ts-node-dev --respawn --transpile-only src/server.ts"
  }
}
```

**For Windows:**

```json
{
  "scripts": {
    "dev": "set NODE_OPTIONS=--max-old-space-size=256&& ts-node-dev --respawn --transpile-only src/server.ts"
  }
}
```

#### Install cross-env (recommended for cross-platform):

```bash
# Frontend
cd frontend
npm install --save-dev cross-env

# Backend
cd backend
npm install --save-dev cross-env
```

---

### 2️⃣ Create .env.local for Frontend

Create `frontend/.env.local`:

```bash
# Memory limit for Node.js
NODE_OPTIONS=--max-old-space-size=512

# Disable telemetry
NEXT_TELEMETRY_DISABLED=1

# Your API URLs
NEXT_PUBLIC_API_URL=http://localhost:5000
NEXT_PUBLIC_SOCKET_URL=http://localhost:5000
```

---

### 3️⃣ Optimize Zed Editor Settings

**Windows:** `%AppData%\Zed\settings.json`  
**Linux/Mac:** `~/.config/zed/settings.json`

```json
{
  "telemetry": {
    "diagnostics": false,
    "metrics": false
  },
  "language_servers": {
    "typescript-language-server": {
      "initialization_options": {
        "maxTsServerMemory": 512
      }
    }
  },
  "file_scan_exclusions": [
    "**/.git",
    "**/.next",
    "**/node_modules",
    "**/dist",
    "**/build",
    "**/.cache"
  ],
  "indexed_file_scan_exclusions": [
    "**/.next",
    "**/node_modules",
    "**/dist",
    "**/build"
  ],
  "git": {
    "enabled": true,
    "autoFetch": false
  }
}
```

---

## 📊 Expected Results

### Before Optimization:
| Component | RAM Usage |
|-----------|-----------|
| Next.js Dev | 2-3 GB |
| Backend | 300-500 MB |
| Zed Editor | 400-600 MB |
| Browser | 500-800 MB |
| Windows | 1-2 GB |
| **TOTAL** | **4.5-6.9 GB** → **98% on 4GB RAM!** |

### After Optimization:
| Component | RAM Usage |
|-----------|-----------|
| Next.js Dev | 512 MB - 1 GB |
| Backend | 150-256 MB |
| Zed Editor | 250-400 MB |
| Browser | 400-600 MB |
| Windows | 1-2 GB |
| **TOTAL** | **2.5-3.5 GB** → **~65% on 4GB RAM** ✅ |

---

## 🔧 Advanced Optimizations

### 4️⃣ Next.js Configuration (Already Applied!)

`frontend/next.config.ts` has been optimized with:
- ✅ Turbopack enabled (faster, less memory)
- ✅ ISR cache disabled in dev
- ✅ Worker threads disabled
- ✅ Webpack optimized for low memory
- ✅ Font optimization disabled in dev

### 5️⃣ Browser Optimization

#### Option A: Use Firefox Developer Edition
- Lighter than Chrome/Edge
- Better for development with limited RAM
- Download: https://www.mozilla.org/firefox/developer/

#### Option B: Chrome/Edge with Memory Saver
1. Chrome → Settings → Performance
2. Enable "Memory Saver"
3. Add localhost:3000 to exceptions

#### Option C: Limit Browser Tabs
- Keep ONLY localhost:3000 open
- Close docs/StackOverflow (use bookmarks)
- Disable unnecessary extensions

### 6️⃣ Windows System Optimizations

#### A. Increase Virtual Memory (Pagefile)

1. Press `Win + R`, type: `sysdm.cpl`
2. Advanced → Performance Settings → Advanced
3. Virtual Memory → Change
4. Uncheck "Automatically manage"
5. Set custom size:
   - **Initial size:** 4096 MB
   - **Maximum size:** 8192 MB
6. Click Set → OK → Restart

#### B. Disable Startup Programs

1. Press `Ctrl + Shift + Esc` (Task Manager)
2. Startup tab
3. Disable unnecessary apps:
   - Discord
   - Slack
   - Microsoft Teams
   - Steam
   - Epic Games Launcher
   - OneDrive (if not needed)

#### C. Close Background Apps

```powershell
# Check memory usage
Get-Process | Sort-Object WS -Descending | Select-Object -First 10 Name, @{Name="MB";Expression={[Math]::Round($_.WS / 1MB, 2)}}
```

Kill heavy processes you don't need.

#### D. Windows Settings

1. Settings → System → Storage
2. Enable "Storage Sense"
3. Clean temp files regularly

---

## 🎯 Development Workflow Strategies

### Strategy 1: Production Build for Stable Testing

```bash
# Build frontend once (when stable)
cd frontend
npm run build

# Run production build (uses 60% less memory!)
npm start

# Keep backend in dev mode
cd ../backend
npm run dev
```

**When to use:** Testing stable features, UI polish

### Strategy 2: Selective Development

**Working on Frontend?**
```bash
# Only run frontend dev server
cd frontend
npm run dev

# Mock backend with MSW or json-server
```

**Working on Backend?**
```bash
# Only run backend
cd backend
npm run dev

# Test with Postman/Thunder Client
# Or use frontend production build: npm start
```

### Strategy 3: Clear Cache Regularly

```bash
# Clear Next.js cache
cd frontend
rmdir /s /q .next
npm run dev

# Clear backend dist
cd backend
rmdir /s /q dist
npm run dev
```

---

## 🆘 Emergency Mode (When RAM Still Critical)

### Option 1: Use Production Builds

```bash
# Build everything once
cd frontend
npm run build

cd ../backend
npm run build

# Run both in production mode
cd frontend
npm start  # Terminal 1

cd backend
npm start  # Terminal 2
```

**Pros:** Uses 50-70% less RAM  
**Cons:** No hot reload (need to rebuild after changes)

### Option 2: Backend-Only Development

```bash
# Only run backend
cd backend
npm run dev

# Test API with Postman/Insomnia/Thunder Client
```

### Option 3: Frontend-Only Development

```bash
# Only run frontend
cd frontend
npm run dev

# Create mock API with:
# - MSW (Mock Service Worker)
# - json-server
# - Mirage.js
```

### Option 4: Use Online IDE

If RAM is still too limited, use cloud development:
- **GitHub Codespaces** (free 60 hours/month)
- **Gitpod** (free 50 hours/month)
- **CodeSandbox** (free tier available)
- **StackBlitz** (runs in browser)

---

## 🔍 Monitoring & Debugging

### Check Current RAM Usage

```bash
# Windows PowerShell
Get-WmiObject Win32_OperatingSystem | Select-Object @{Name="FreeGB";Expression={[math]::Round($_.FreePhysicalMemory/1MB,2)}}, @{Name="TotalGB";Expression={[math]::Round($_.TotalVisibleMemorySize/1MB,2)}}
```

### Monitor Specific Processes

```bash
# Find Node.js processes
Get-Process | Where-Object {$_.Name -like "*node*"} | Format-Table Name, @{Name="Memory (MB)";Expression={[Math]::Round($_.WS / 1MB, 2)}}
```

### Task Manager Shortcut

```
Ctrl + Shift + Esc
```

Look for:
- node.exe (multiple instances)
- chrome.exe / msedge.exe
- Zed.exe

---

## 📝 RAM Configuration by System Size

### 4GB RAM (Minimum)

```json
// frontend/package.json
"dev": "set NODE_OPTIONS=--max-old-space-size=384&& next dev --turbopack -p 3000"

// backend/package.json
"dev": "set NODE_OPTIONS=--max-old-space-size=192&& ts-node-dev --respawn --transpile-only src/server.ts"
```

**Workflow:**
- Use production builds when possible
- Close all unnecessary apps
- Use Firefox instead of Chrome
- Run only one dev server at a time

### 8GB RAM (Comfortable)

```json
// frontend/package.json
"dev": "set NODE_OPTIONS=--max-old-space-size=1024&& next dev --turbopack -p 3000"

// backend/package.json
"dev": "set NODE_OPTIONS=--max-old-space-size=512&& ts-node-dev --respawn --transpile-only src/server.ts"
```

**Workflow:**
- Can run both servers simultaneously
- Use Chrome/Edge normally
- Keep some background apps running

### 16GB+ RAM (Ideal)

```json
// frontend/package.json
"dev": "next dev --turbopack -p 3000"

// backend/package.json
"dev": "ts-node-dev --respawn --transpile-only src/server.ts"
```

**Workflow:**
- No restrictions
- Full development experience

---

## ✅ Setup Checklist

Apply these optimizations in order:

- [ ] **1. Update package.json scripts** (frontend & backend)
- [ ] **2. Install cross-env** (if needed)
- [ ] **3. Create .env.local** (frontend)
- [ ] **4. Configure Zed settings** (editor optimization)
- [ ] **5. Close unnecessary apps** (Discord, Slack, etc.)
- [ ] **6. Increase virtual memory** (pagefile)
- [ ] **7. Restart dev servers** (apply changes)
- [ ] **8. Monitor RAM usage** (Task Manager)
- [ ] **9. Test application** (ensure it works)
- [ ] **10. Fine-tune if needed** (adjust memory limits)

---

## 💡 Pro Tips

### Tip 1: Clear .next Folder Regularly

```bash
cd frontend
rmdir /s /q .next
npm run dev
```

This clears build cache and can free up memory.

### Tip 2: Use Lightweight Terminal

Replace Windows Terminal with:
- **Alacritty** (minimal RAM)
- **Cmder** (portable, lightweight)

### Tip 3: Git Commit Before Heavy Work

Save your work before running memory-intensive tasks.

### Tip 4: Restart Dev Servers Periodically

Memory leaks can accumulate. Restart every 2-3 hours:
```bash
# Press Ctrl+C in both terminals
# Then restart: npm run dev
```

### Tip 5: Consider RAM Upgrade

If possible, upgrade to 8GB RAM (~$20-30 for DDR4 stick).

Best investment for web development!

---

## 🚀 Quick Start Script

Create `start-dev.bat` in project root:

```batch
@echo off
echo Starting optimized development environment...

echo.
echo [1/3] Starting Backend Server...
start "Backend" cmd /k "cd backend && set NODE_OPTIONS=--max-old-space-size=256&& npm run dev"

timeout /t 3

echo [2/3] Starting Frontend Server...
start "Frontend" cmd /k "cd frontend && set NODE_OPTIONS=--max-old-space-size=512&& npm run dev"

echo [3/3] Opening Browser...
timeout /t 10
start http://localhost:3000

echo.
echo ✅ Development environment started!
echo ⚠️  Close terminal windows to stop servers
pause
```

Run with: `start-dev.bat`

---

## 📞 Still Having Issues?

### Last Resort Options:

1. **Use WSL2 (Windows Subsystem for Linux)**
   - Generally lighter than Windows
   - Better memory management
   - Install: `wsl --install`

2. **Docker with Memory Limits**
   ```yaml
   # docker-compose.yml
   services:
     frontend:
       mem_limit: 512m
     backend:
       mem_limit: 256m
   ```

3. **Remote Development**
   - Deploy to Vercel/Netlify (frontend)
   - Deploy to Railway/Render (backend)
   - Develop directly in cloud

4. **Upgrade Hardware**
   - Add 4GB RAM stick (~$20-30)
   - Total 8GB = comfortable development

---

## 📊 Summary

### What We Did:
✅ Limited Node.js memory usage (512MB frontend, 256MB backend)  
✅ Optimized Next.js configuration  
✅ Configured Zed editor for low memory  
✅ Disabled unnecessary features in dev mode  
✅ Provided workflow strategies  

### Expected Result:
- **Before:** 98% RAM usage (4.5-7 GB)
- **After:** 60-70% RAM usage (2.5-3.5 GB)
- **Improvement:** ~40-50% reduction

### Best Practices:
1. Use production builds for stable testing
2. Clear cache regularly
3. Close unnecessary apps
4. Monitor RAM usage
5. Restart servers periodically

---

**Good luck with your development! 🚀**

**Questions? Check the troubleshooting section or open an issue!**