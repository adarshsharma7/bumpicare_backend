import { Router } from "express";
import { verifyJWT } from "../middleware/auth.middleware.js";
import {
  getWishlist,
  addToWishlist,
  removeFromWishlist,
} from "../controllers/wishlist.controller.js";

const router = Router();

router.get("/get", verifyJWT, getWishlist);
router.post("/add", verifyJWT, addToWishlist);
router.post("/remove", verifyJWT, removeFromWishlist);

export default router;
