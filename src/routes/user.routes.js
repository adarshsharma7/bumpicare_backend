import { Router } from "express";
import { verifyJWT } from "../middleware/auth.middleware.js";
import {
  getCurrentUser,
  getUserAddress,
  addUserAddress,
  updateUserAddress,
  deleteUserAddress,
  selectUserAddress,
} from "../controllers/user.controller.js";

const router = Router();

router.get("/me", verifyJWT, getCurrentUser);

// 🏡 Address CRUD Routes
router
  .route("/address")
  .get(verifyJWT, getUserAddress)
  .post(verifyJWT, addUserAddress);

router
  .route("/address/:id")
  .put(verifyJWT, updateUserAddress)
  .delete(verifyJWT, deleteUserAddress);

// ✅ Separate route for selecting an address
router.patch("/address/:id/select", verifyJWT, selectUserAddress);

export default router;
