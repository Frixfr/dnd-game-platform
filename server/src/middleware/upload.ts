// server/src/middleware/upload.ts
import multer from "multer";
import path from "path";
import fs from "fs";

const uploadDir = "uploads/avatars";

if (!fs.existsSync(uploadDir)) {
  fs.mkdirSync(uploadDir, { recursive: true });
}

const storage = multer.diskStorage({
  destination: (_req, _file, cb) => {
    cb(null, uploadDir);
  },
  filename: (_req, file, cb) => {
    const uniqueSuffix = Date.now() + "-" + Math.round(Math.random() * 1e9);
    const ext = path.extname(file.originalname);
    cb(null, `avatar-${uniqueSuffix}${ext}`);
  },
});

const fileFilter = (
  _req: Express.Request,
  file: Express.Multer.File,
  cb: multer.FileFilterCallback,
) => {
  const allowedTypes = /jpeg|jpg|png|gif|webp/;
  const extname = allowedTypes.test(
    path.extname(file.originalname).toLowerCase(),
  );
  const mimetype = allowedTypes.test(file.mimetype);
  if (mimetype && extname) {
    cb(null, true);
  } else {
    cb(new Error("Только изображения (jpeg, jpg, png, gif, webp)"));
  }
};

export const upload = multer({
  storage,
  limits: { fileSize: 10 * 1024 * 1024 },
  fileFilter,
});

const mapUploadDir = "uploads/maps";
if (!fs.existsSync(mapUploadDir)) {
  fs.mkdirSync(mapUploadDir, { recursive: true });
}

const mapStorage = multer.diskStorage({
  destination: (_req, _file, cb) => {
    cb(null, mapUploadDir);
  },
  filename: (_req, file, cb) => {
    const uniqueSuffix = Date.now() + "-" + Math.round(Math.random() * 1e9);
    const ext = path.extname(file.originalname);
    cb(null, `map-${uniqueSuffix}${ext}`);
  },
});

export const uploadMap = multer({
  storage: mapStorage,
  limits: { fileSize: 20 * 1024 * 1024 },
  fileFilter,
});
