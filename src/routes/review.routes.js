import { Router } from "express";
import { verifyJWT } from "../middleware/auth.middleware.js";
import {
  addReview,
  getReviews,
  updateReview,
  deleteReview,
} from "../controllers/review.controller.js";
import { uploadImages } from "../middleware/upload.js";

const router = Router();

router.get("/get/:productId", getReviews);
router.post("/add", verifyJWT,uploadImages, addReview);
router.put("/update", verifyJWT,uploadImages, updateReview);
router.delete("/delete", verifyJWT, deleteReview);

export default router;
