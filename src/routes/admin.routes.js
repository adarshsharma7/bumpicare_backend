import { Router } from "express";
import { verifyJWT } from "../middleware/auth.middleware.js";
import {
  getAllUsers,
  getAllOrders,
  getDashboardStats,
} from "../controllers/admin.controller.js";

const router = Router();

router.get("/admin/users", verifyJWT, getAllUsers);
router.get("/admin/orders", verifyJWT, getAllOrders);
router.get("/admin/stats", verifyJWT, getDashboardStats);

export default router;
