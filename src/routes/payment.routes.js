import { Router } from "express";
import {
  createPaymentOrder,
  verifyPayment,
  refundPayment,
} from "../controllers/payment.controller.js";
import { verifyJWT } from "../middleware/auth.middleware.js";

const router = Router();

router.post("/order", verifyJWT, createPaymentOrder);
router.post("/verify", verifyJWT, verifyPayment);
router.post("/refund", verifyJWT, refundPayment);

export default router;
