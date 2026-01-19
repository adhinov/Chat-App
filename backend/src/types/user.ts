// src/types/user.ts

/**
 * =========================
 * CURRENT AUTHENTICATED USER
 * =========================
 * Data ini berasal dari endpoint:
 * GET /api/auth/me
 */
export type CurrentUser = {
  id: number;
  email: string;
  username: string;
  phone?: string | null;
  avatar?: string | null;
  role: "USER" | "ADMIN" | string;

  /**
   * Login SEBELUM login saat ini
   * - null  -> First login
   * - string ISO -> login sebelumnya
   */
  previousLogin?: string | null;
};
