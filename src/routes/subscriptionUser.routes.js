import { Router } from "express";
import { verifyJWT } from "../middleware/auth.middleware.js";

import {
  getActivePlans,
  getMySubscription,
  subscribeToPlan,
  checkCartLimit,
  checkWishlistLimit,
  updateUsage
} from "../controllers/subscription.controller.js";

const router = Router();

// ==================== PUBLIC ROUTES ====================
router.get("/plans", getActivePlans);

// ==================== PROTECTED ROUTES ====================
router.get("/my-subscription", verifyJWT, getMySubscription);

// Subscribe
router.post("/subscribe", verifyJWT, subscribeToPlan);

// Cart/Wishlist limit
router.get("/check-cart-limit", verifyJWT, checkCartLimit);
router.get("/check-wishlist-limit", verifyJWT, checkWishlistLimit);

// ==================== UPDATE USAGE ====================
router.post("/update-usage", verifyJWT, updateUsage);

export default router;
