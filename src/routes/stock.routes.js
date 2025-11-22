import { Router } from "express";
import { verifyJWT } from "../middleware/auth.middleware.js";
import {
    getStockSummary,
    getStockProducts
} from "../controllers/admin.controller.js";

const router = Router();
router.get("/stock-summary", verifyJWT, getStockSummary);
router.get("/stock-products", verifyJWT, getStockProducts);

export default router;
