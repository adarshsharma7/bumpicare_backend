import { Router } from "express";
import { verifyJWT } from "../middleware/auth.middleware.js";
import {
  getAllProducts,
  getSingleProduct,
} from "../controllers/product.controller.js";

const router = Router();

router.get("/get", getAllProducts);
router.get("/:id", getSingleProduct);


export default router;
