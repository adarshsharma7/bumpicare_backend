import { Router } from "express";
import { verifyJWT } from "../middleware/auth.middleware.js";
import {
  getAllProducts,
  getSingleProduct,
  addProduct,
  updateProduct,
  deleteProduct,
} from "../controllers/product.controller.js";

const router = Router();

router.get("/get", getAllProducts);
router.get("/:id", getSingleProduct);
router.post("/add", verifyJWT, addProduct);
router.put("/:id", verifyJWT, updateProduct);
router.delete("/:id", verifyJWT, deleteProduct);

export default router;
