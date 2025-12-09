// ganti import
import * as jwt from "jsonwebtoken";
import bcrypt from "bcryptjs";
import prisma from "../config/prisma";

const JWT_SECRET = (process.env.JWT_SECRET || "your_jwt_secret_key") as jwt.Secret;
const JWT_EXPIRE = process.env.JWT_EXPIRE || "24h";

export class AuthService {
  static generateToken(payload: {
    id: number;
    username?: string | null;
    phone?: string | null;
    email?: string | null;
    role?: string | null;
  }): string {
    // normalisasi: gunakan null (bukan undefined) untuk fields opsional
    const tokenPayload = {
      id: payload.id,
      username: payload.username ?? null,
      phone: payload.phone ?? null,
      email: payload.email ?? null,
      role: payload.role ?? null,
    };

    // cast expiresIn ke bentuk yang diharapkan SignOptions
    const signOptions: jwt.SignOptions = {
      expiresIn: JWT_EXPIRE as jwt.SignOptions["expiresIn"],
    };

    // panggil sign dengan tipe yang eksplisit
    return jwt.sign(tokenPayload, JWT_SECRET, signOptions);
  }

  // ... (sisa class tetap sama)
}
