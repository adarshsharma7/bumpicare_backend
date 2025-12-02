// routes/coupon.routes.js
import express from "express";
import { verifyJWT } from "../middleware/auth.middleware.js";
import { 
  getActiveCoupons, 
  applyCoupon, 
  removeCoupon 
} from "../controllers/coupon.controller.js";

const router = express.Router();

router.get("/active", verifyJWT, getActiveCoupons);
router.post("/apply", verifyJWT, applyCoupon);
router.post("/remove", verifyJWT, removeCoupon);

export default router;