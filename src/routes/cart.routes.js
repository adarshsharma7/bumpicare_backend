import { Router } from "express";
import { verifyJWT } from "../middleware/auth.middleware.js";
import {
  getCart,
  addToCart,
  updateCart,
  removeFromCart,
} from "../controllers/cart.controller.js";

const router = Router();

router.get("/get", verifyJWT, getCart);
router.post("/add", verifyJWT, addToCart);
router.put("/update", verifyJWT, updateCart);
router.post("/remove", verifyJWT, removeFromCart);

export default router;
