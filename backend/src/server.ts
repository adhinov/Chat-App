import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import { connectDB, prisma } from './config/database';
import bcrypt from 'bcryptjs';

dotenv.config();

const app = express();
const port = process.env.PORT || 9002;

// Allowed origins (from Railway ENV)
const allowedOrigins = process.env.CORS_ORIGIN
  ? process.env.CORS_ORIGIN.split(",").map(o => o.trim())
  : ["http://localhost:3000"];

// --------------------
// CORS CONFIG (FIX ✔)
// --------------------
app.use(
  cors({
    origin: function (origin, callback) {
      if (!origin) return callback(null, true); // allow server-to-server / mobile clients

      if (allowedOrigins.includes(origin)) {
        return callback(null, true);
      }

      return callback(new Error("Not allowed by CORS: " + origin));
    },
    methods: ["GET", "POST", "PUT", "DELETE", "PATCH", "OPTIONS"],
    allowedHeaders: ["Content-Type", "Authorization"],
    credentials: true,
  })
);

// Express 5 — FIX wildcard OPTIONS
app.options("*", cors());

app.use(express.json());

// Connect database
connectDB();

// ---------------------------
// Auto-create default admin
// ---------------------------
async function ensureAdminUser() {
  try {
    const adminEmail = 'admin@example.com';

    const existingAdmin = await prisma.user.findUnique({
      where: { email: adminEmail },
    });

    if (!existingAdmin) {
      const hashedPassword = await bcrypt.hash('admin123', 10);

      await prisma.user.create({
        data: {
          username: 'admin',
          email: adminEmail,
          phone: '0',
          password: hashedPassword,
          role: 'ADMIN',
        },
      });

      console.log('✓ Default admin created successfully!');
    } else {
      console.log('✓ Admin already exists. Skipping creation.');
    }
  } catch (error) {
    console.error('Failed to ensure admin user:', error);
  }
}

ensureAdminUser();

// --------------------
// Routes
// --------------------
import authRoutes from './routes/auth.routes';
import adminRoutes from './routes/admin.routes';

app.use('/api/auth', authRoutes);
app.use('/api/admin', adminRoutes);

// Root route
app.get('/', (req, res) => {
  res.json({ message: 'Welcome to Chat App API' });
});

// Start server
app.listen(port, () => {
  console.log(`Server is running on port ${port}`);
});
