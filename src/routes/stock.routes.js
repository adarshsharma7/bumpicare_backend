import { Router } from "express";
import { isAdmin, verifyJWT } from "../middleware/auth.middleware.js";
import {
    getStockSummary,
    getStockProducts,
    updateStock
} from "../controllers/admin.controller.js";

const router = Router();
router.get("/stock-summary", verifyJWT,isAdmin, getStockSummary);
router.get("/stock-products", verifyJWT,isAdmin, getStockProducts);
router.patch('/stock/update',verifyJWT, isAdmin, updateStock);

export default router;
