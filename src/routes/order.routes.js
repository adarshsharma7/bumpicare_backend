import { Router } from "express";
import { verifyJWT } from "../middleware/auth.middleware.js";
import {
  createOrder,
  // getOrderById,
  createSingleOrder,
  getAllOrders,
  cancelOrder,
  updateOrderStatus,
  getUserOrders,
} from "../controllers/order.controller.js";

const router = Router();

router.post("/create", verifyJWT, createOrder);
router.post("/single", verifyJWT, createSingleOrder);
// router.get("/:id", verifyJWT, getOrderById);
router.get("/getAll", verifyJWT, getAllOrders);
router.get("/get", verifyJWT, getUserOrders);
router.post("/cancel", verifyJWT, cancelOrder);
router.put("/:id/update-status", verifyJWT, updateOrderStatus);

export default router;
