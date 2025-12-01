import jwt from "jsonwebtoken";
import bcrypt from "bcryptjs";
import prisma from "../config/prisma";

const JWT_SECRET = process.env.JWT_SECRET || "your_jwt_secret_key";
const JWT_EXPIRE = process.env.JWT_EXPIRE || "24h";

export class AuthService {
  static generateToken(user: {
    id: number;
    username?: string | null;
    phone?: string | null;
    email?: string | null;
    role?: string | null;
  }): string {
    const payload = {
      id: user.id,
      username: user.username ?? undefined,
      phone: user.phone ?? undefined,
      email: user.email ?? undefined,
      role: user.role ?? undefined,
    };

    // FIX — bypass strict overload
    return (jwt as any).sign(payload, JWT_SECRET, {
      expiresIn: JWT_EXPIRE,
    });
  }

  static async login(identifier: string, password: string) {
    const isEmail = identifier.includes("@");

    const where = isEmail
      ? { email: identifier }
      : { phone: identifier };

    // FIX — use findFirst instead of findUnique
    const user = await prisma.user.findFirst({ where });

    if (!user) throw new Error("Invalid credentials");

    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch) throw new Error("Invalid credentials");

    const token = this.generateToken({
      id: user.id,
      username: user.username,
      phone: user.phone,
      email: user.email,
      role: user.role,
    });

    return {
      token,
      user: {
        id: user.id,
        username: user.username,
        phone: user.phone,
        email: user.email,
        role: user.role,
      },
    };
  }

  static async signup(
    username: string,
    phone: string,
    email: string,
    password: string
  ) {
    const existingUser = await prisma.user.findFirst({
      where: {
        OR: [{ phone }, { email }, { username }],
      },
    });

    if (existingUser)
      throw new Error("User already exists (phone/email/username)");

    const hashed = await bcrypt.hash(password, 10);

    const user = await prisma.user.create({
      data: {
        username,
        phone,
        email,
        password: hashed,
        role: "USER",
      },
    });

    const token = this.generateToken({
      id: user.id,
      username: user.username,
      phone: user.phone,
      email: user.email,
      role: user.role,
    });

    return {
      token,
      user: {
        id: user.id,
        username: user.username,
        phone: user.phone,
        email: user.email,
        role: user.role,
      },
    };
  }
}
