import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import { connectDB, prisma } from './config/database'; // pastikan prisma diexport dari sini
import bcrypt from 'bcryptjs';

// Load environment variables
dotenv.config();

// Initialize express app
const app = express();
const port = process.env.PORT || 9002;

// Middleware
app.use(
  cors({
    origin: process.env.CORS_ORIGIN?.split(",") || ["http://localhost:3000"],
    credentials: true,
  })
);
app.use(express.json());

// Connect to database
connectDB();

// 🔥 AUTO CREATE DEFAULT ADMIN
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
          role: 'ADMIN', // FIX
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

// Jalankan setelah DB connect
ensureAdminUser();

// Import routes
import authRoutes from './routes/auth.routes';
import adminRoutes from './routes/admin.routes';

// Routes
app.use('/api/auth', authRoutes);
app.use('/api/admin', adminRoutes);

// Basic route
app.get('/', (req, res) => {
  res.json({ message: 'Welcome to Chat App API' });
});

// Start server
app.listen(port, () => {
  console.log(`Server is running on port ${port}`);
});
