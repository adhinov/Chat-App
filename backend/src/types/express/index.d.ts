import "express";

declare global {
  namespace Express {
    interface Request {
      file?: {
        filename: string;
        path: string;
        mimetype: string;
        size: number;
      };
    }
  }
}
