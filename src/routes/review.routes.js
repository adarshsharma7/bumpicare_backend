import { Router } from "express";
import { verifyJWT } from "../middleware/auth.middleware.js";
import {
  addReview,
  getReviews,
  updateReview,
  deleteReview,
} from "../controllers/review.controller.js";

const router = Router();

router.get("/get/:productId", getReviews);
router.post("/add", verifyJWT, addReview);
router.put("/update", verifyJWT, updateReview);
router.delete("/delete", verifyJWT, deleteReview);

export default router;
