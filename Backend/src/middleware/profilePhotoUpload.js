const fs = require("fs");
const path = require("path");
const multer = require("multer");

const PROFILE_PHOTO_DIR = path.join(__dirname, "../uploads/profile-photos");
const ALLOWED_MIME = new Set([
  "image/jpeg",
  "image/png",
  "image/webp",
  "image/gif",
]);
const MAX_BYTES = 2 * 1024 * 1024;

if (!fs.existsSync(PROFILE_PHOTO_DIR)) {
  fs.mkdirSync(PROFILE_PHOTO_DIR, { recursive: true });
}

const storage = multer.diskStorage({
  destination: (_req, _file, cb) => {
    cb(null, PROFILE_PHOTO_DIR);
  },
  filename: (req, file, cb) => {
    const userId = String(req.auth?.userId || "user");
    const ext = path.extname(file.originalname || "").toLowerCase();
    const safeExt = [".jpg", ".jpeg", ".png", ".webp", ".gif"].includes(ext)
      ? ext === ".jpeg"
        ? ".jpg"
        : ext
      : ".jpg";
    cb(null, `${userId}-${Date.now()}${safeExt}`);
  },
});

const upload = multer({
  storage,
  limits: { fileSize: MAX_BYTES },
  fileFilter: (_req, file, cb) => {
    if (ALLOWED_MIME.has(file.mimetype)) {
      cb(null, true);
      return;
    }
    cb(new Error("Only JPEG, PNG, WebP, or GIF images are allowed"));
  },
});

const profilePhotoUpload = upload.single("photo");

module.exports = {
  PROFILE_PHOTO_DIR,
  profilePhotoUpload,
};
