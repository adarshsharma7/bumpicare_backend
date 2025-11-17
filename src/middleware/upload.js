import multer from "multer";

const storage = multer.memoryStorage();
export const uploadImages = multer({
  storage,
  limits: { fileSize: 10 * 1024 * 1024 }, // 10MB per file
}).array("images", 4); // max 4 images
