import multer from "multer";
import { Request } from "express";

// ===============================
// MULTER CONFIG (MEMORY STORAGE)
// ===============================
const storage = multer.memoryStorage();

// ===============================
// FILE FILTER (HANYA GAMBAR)
// ===============================
const fileFilter = (
  _req: Request,
  file: Express.Multer.File,
  cb: multer.FileFilterCallback
) => {
  if (file.mimetype.startsWith("image/")) {
    cb(null, true);
  } else {
    cb(new Error("Hanya file gambar yang diperbolehkan"));
  }
};

// ===============================
// EXPORT MIDDLEWARE
// ===============================
export const uploadAvatar = multer({
  storage,
  fileFilter,
  limits: {
    fileSize: 2 * 1024 * 1024, // 2MB
  },
}).single("avatar");
