import { Router } from "express";
import { verifyJWT } from "../middleware/auth.middleware.js";
import {
  getCategories,
  addCategory,
  updateCategory,
  deleteCategory,
} from "../controllers/category.controller.js";

const router = Router();

router.get("/get", getCategories);
router.post("/add", verifyJWT, addCategory);
router.put("/update", verifyJWT, updateCategory);
router.delete("/delete", verifyJWT, deleteCategory);

export default router;
