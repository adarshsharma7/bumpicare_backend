import { Router } from "express";
import { verifyJWT } from "../middleware/auth.middleware.js";

import {
  getAllSellers,
  getSingleSeller,
  addSeller,
  updateSeller,
  updateSellerStatus,
  assignProductsToSeller,
  deleteSeller,
} from "../controllers/admin.controller.js";

const router = Router();

// Public or Admin (depends on your logic)
router.get("/get", getAllSellers);
router.get("/:id", getSingleSeller);

// Admin protected routes
router.post("/", verifyJWT, addSeller);
router.put("/:id", verifyJWT, updateSeller);
router.patch("/:id/status", verifyJWT, updateSellerStatus);
router.post("/:id/assign-products", verifyJWT, assignProductsToSeller);
router.delete("/:id", verifyJWT, deleteSeller);

export default router;
