import "express";

export interface JwtUserPayload {
  id: number;
  email: string;
  username: string;
  role: "ADMIN" | "USER";
}

declare global {
  namespace Express {
    interface Request {
      user?: JwtUserPayload;
    }
  }
}
