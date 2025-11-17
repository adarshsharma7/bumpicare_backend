import { Router } from "express";
import { verifyJWT, isAdmin } from "../middleware/auth.middleware.js";
import {
  // Dashboard
  getDashboardStats,

  // Users
  getAllUsers,
  getUserDetails,
  toggleUserStatus,

  // Products
  getAdminProducts,
  getSingleProduct,
  addProduct,
  updateProduct,
  deleteProduct,
  toggleProductStatus,
  bulkUpdateStock,

  // Orders
  getAdminOrders,
  getOrderDetails,
  updateOrderStatusAdmin,

  // Categories
  getAllCategories,
  addCategory,
  updateCategory,
  deleteCategory,

  // Reviews
  getAllReviews,
  deleteReview,
} from "../controllers/admin.controller.js";

const router = Router();

// All routes require admin authentication
router.use(verifyJWT, isAdmin);

// ==================== DASHBOARD ====================
router.get("/dashboard/stats", getDashboardStats);

// ==================== USERS ====================
router.get("/users", getAllUsers);
router.get("/users/:id", getUserDetails);
router.patch("/users/:id/toggle-status", toggleUserStatus);

// ==================== PRODUCTS ====================
router.get("/products", getAdminProducts);
router.get("/product", getSingleProduct);
router.post("/product/add", verifyJWT, addProduct);
router.put("/product/:id", verifyJWT, updateProduct);
router.delete("/product/:id", verifyJWT, deleteProduct);
router.patch("/products/:id/toggle-status", toggleProductStatus);
router.post("/products/bulk-update-stock", bulkUpdateStock);

// ==================== ORDERS ====================
router.get("/orders", getAdminOrders);
router.get("/orders/:id", getOrderDetails);
router.patch("/orders/:id/status", updateOrderStatusAdmin);

// ==================== CATEGORIES ====================
router.get("/categories", getAllCategories);
router.post("/categories", addCategory);
router.put("/categories/:id", updateCategory);
router.delete("/categories/:id", deleteCategory);

// ==================== REVIEWS ====================
router.get("/reviews", getAllReviews);
router.delete("/reviews/:id", deleteReview);

export default router;