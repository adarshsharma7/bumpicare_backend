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
  getOrderStats,
  getOrderChartData,
  getOrderDetails,
  updateOrderStatusAdmin,
  cancelOrderByAdmin,
  getRecentOrders,

  // Categories
  getAllCategories,
  addCategory,
  updateCategory,
  deleteCategory,

  // Reviews
  getAllReviews,
  deleteReview,


  getAllTags,
  addTag,
  updateTag,
  deleteTag,
  getAllProductTypes,
  addProductType,
  updateProductType,
  deleteProductType,

  createOrderRequest,
  getAllOrderRequests,
  updateOrderRequestStatus,


  getAllSuppliers,
  getSingleSupplier,
  createSupplier,
  updateSupplier,
  deleteSupplier,

  getAllWarehouses,
  getSingleWarehouse,
  createWarehouse,
  updateWarehouse,
  deleteWarehouse,
  getInventoryOverview,
  getLowStockProducts,
  getOutOfStockProducts,
  getTopProductsByValue,
  getInventoryMovements,
  createInventoryMovement,
  getStockTrends,
  getCategoryWiseStock,

// Sales
   getSalesStats,
  getRevenueChart,
  getTopCountries,
  getSalesReports,
  exportSalesReports



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
router.get("/product/:id", getSingleProduct);
router.post("/product/add", verifyJWT, addProduct);
router.put("/product/:id", verifyJWT, updateProduct);
router.delete("/product/:id", verifyJWT, deleteProduct);
router.patch("/products/:id/toggle-status", toggleProductStatus);
router.post("/products/bulk-update-stock", bulkUpdateStock);


// ==================== ORDER REQUEST ROUTES ====================
router.post('/orders/request', isAdmin, createOrderRequest);
router.get('/orders/requests', isAdmin, getAllOrderRequests);
router.put('/orders/request/:id', isAdmin, updateOrderRequestStatus);

// ==================== ORDERS ====================
router.get("/orders", getAdminOrders);
router.get('/orders/stats', isAdmin, getOrderStats);
router.get('/orders/chart', isAdmin, getOrderChartData);
router.get("/orders/recent", verifyJWT, isAdmin, getRecentOrders);
router.get("/orders/:id", getOrderDetails);
router.put("/orders/:id/status", updateOrderStatusAdmin);
// CANCEL ORDER
router.put("/order/:orderId/cancel", verifyJWT, isAdmin, cancelOrderByAdmin);


// ==================== CATEGORIES ====================
router.get("/categories", getAllCategories);
router.post("/categories", addCategory);
router.put("/categories/:id", updateCategory);
router.delete("/categories/:id", deleteCategory);

// ==================== REVIEWS ====================
router.get("/reviews", getAllReviews);
router.delete("/reviews/:id", deleteReview);


// ==================== TAGS ====================
router.get("/tags", getAllTags);
router.post("/tags", addTag);
router.put("/tags/:id", updateTag);
router.delete("/tags/:id", deleteTag);

// ==================== PRODUCT TYPES ====================
router.get("/product-types", getAllProductTypes);
router.post("/product-types", addProductType);
router.put("/product-types/:id", updateProductType);
router.delete("/product-types/:id", deleteProductType);


// ==================== SUPPLIER ROUTES ====================
router.get('/suppliers', getAllSuppliers);
router.get('/suppliers/:id', getSingleSupplier);
router.post('/suppliers', isAdmin, createSupplier);
router.put('/suppliers/:id', isAdmin, updateSupplier);
router.delete('/suppliers/:id', isAdmin, deleteSupplier);

// ==================== WAREHOUSE ROUTES ====================
router.get('/warehouses', getAllWarehouses);
router.get('/warehouses/:id', getSingleWarehouse);
router.post('/warehouses', isAdmin, createWarehouse);
router.put('/warehouses/:id', isAdmin, updateWarehouse);
router.delete('/warehouses/:id', isAdmin, deleteWarehouse);


// Inventory Overview Routes
router.get('/inventory/overview', isAdmin, getInventoryOverview);
router.get('/inventory/low-stock', isAdmin, getLowStockProducts);
router.get('/inventory/out-of-stock', isAdmin, getOutOfStockProducts);
router.get('/inventory/top-value', isAdmin, getTopProductsByValue);
router.get('/inventory/movements', isAdmin, getInventoryMovements);
router.post('/inventory/movements', isAdmin, createInventoryMovement);
router.get('/inventory/trends', isAdmin, getStockTrends);
router.get('/inventory/category-wise', isAdmin, getCategoryWiseStock);

// ==================== SALES REPORT ROUTES ====================
router.get('/sales/stats', isAdmin, getSalesStats);
router.get('/sales/revenue-chart', isAdmin, getRevenueChart);
router.get('/sales/top-countries', isAdmin, getTopCountries);
router.get('/sales/reports', isAdmin, getSalesReports);
router.get('/sales/export', isAdmin, exportSalesReports);


export default router;