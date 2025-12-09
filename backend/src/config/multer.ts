import multer from "multer";
import path from "path";

// lokasi penyimpanan
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, "uploads/messages");
  },
  filename: (req, file, cb) => {
    const unique = Date.now() + "-" + Math.round(Math.random() * 1e9);
    cb(null, unique + path.extname(file.originalname));
  }
});

// filter jenis file
function fileFilter(req: any, file: any, cb: any) {
  const allowedTypes = [
    "image/png",
    "image/jpeg",
    "image/jpg",
    "application/pdf",
    "text/plain"
  ];

  if (!allowedTypes.includes(file.mimetype)) {
    return cb(new Error("File type not allowed"), false);
  }

  cb(null, true);
}

export const upload = multer({
  storage,
  fileFilter,
  limits: { fileSize: 5 * 1024 * 1024 } // max 5MB
});
