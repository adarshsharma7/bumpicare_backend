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
  getDraftProducts,
  publishDraftProduct,
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
  getReviewById,
  deleteReview,
  bulkDeleteReviews,
  getReviewStats,
  exportReviews,

  // Tags
  getAllTags,
  addTag,
  updateTag,
  deleteTag,
  getSingleTag,
  createTag,

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
  exportSalesReports,

  // Transactions
  getTransactions,
  exportTransactions,
  getAllAdmins,
  getProductsWithReviews,
  getProductReviews,




} from "../controllers/admin.controller.js";
import { createFlashSale, deleteFlashSale, getAllFlashSales, getSingleFlashSale, updateFlashSale } from "../controllers/promotionalDeals/flashSaleController.js";
import { createCoupon, deleteCoupon, getAllCoupons, getSingleCoupon, updateCoupon, validateCoupon } from "../controllers/promotionalDeals/couponController.js";
import { createFeaturedDeal, deleteFeaturedDeal, getAllFeaturedDeals, getSingleFeaturedDeal, updateFeaturedDeal } from "../controllers/promotionalDeals/featuredDealController.js";
import { createClearanceDeal, deleteClearanceDeal, getAllClearanceDeals, getSingleClearanceDeal, updateClearanceDeal } from "../controllers/promotionalDeals/clearanceDealController.js";

const router = Router();

// All routes require admin authentication
router.use(verifyJWT, isAdmin);

// ==================== DASHBOARD ====================
router.get("/dashboard/stats", getDashboardStats);

// ==================== USERS ====================
router.get("/users", getAllUsers);
router.get("/users/:id", getUserDetails);
router.patch("/users/:id/toggle-status", toggleUserStatus);

// Get all admins
router.get("/admin-list", isAdmin, getAllAdmins);


// ==================== PRODUCTS ====================
router.get("/products", getAdminProducts);
router.get("/product/:id", getSingleProduct);
router.post("/product/add", verifyJWT, addProduct);
router.put("/product/:id", verifyJWT, updateProduct);
router.get('/products/drafts', isAdmin, getDraftProducts);
router.patch('/products/:id/publish', isAdmin, publishDraftProduct);
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
router.put("/order/cancel/:orderId", verifyJWT, isAdmin, cancelOrderByAdmin);


// ==================== CATEGORIES ====================
router.get("/categories", getAllCategories);
router.post("/categories", addCategory);
router.put("/categories/:id", updateCategory);
router.delete("/categories/:id", deleteCategory);

// ==================== REVIEWS ====================
// router.get('/reviews', verifyJWT, isAdmin, getAllReviews);
router.get('/reviews/stats', verifyJWT, isAdmin, getReviewStats);
router.get('/reviews/export', verifyJWT, isAdmin, exportReviews);
router.delete('/reviews/:id', verifyJWT, isAdmin, deleteReview);
router.post('/reviews/bulk-delete', verifyJWT, isAdmin, bulkDeleteReviews);
router.get('/reviews/by-products', verifyJWT, isAdmin, getProductsWithReviews);
router.get('/reviews', verifyJWT, isAdmin, getProductReviews); 
router.get('/reviews/:id', verifyJWT, isAdmin, getReviewById);



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

// ==================== TAG ROUTES ====================
// router.get('/tags', getAllTags);
router.get('/tags/:id', getSingleTag);
router.post('/tags', isAdmin, createTag);
// router.put('/tags/:id', authenticateAdmin, updateTag);
// router.delete('/tags/:id', authenticateAdmin, deleteTag);



// Coupon Routes
router.get('/coupons', isAdmin, getAllCoupons);
router.get('/coupons/:id', isAdmin, getSingleCoupon);
router.post('/coupons', isAdmin, createCoupon);
router.put('/coupons/:id', isAdmin, updateCoupon);
router.delete('/coupons/:id', isAdmin, deleteCoupon);
router.post('/coupons/validate', validateCoupon);

// Flash Sale Routes
router.get('/flash-sales', isAdmin, getAllFlashSales);
router.get('/flash-sales/:id', isAdmin, getSingleFlashSale);
router.post('/flash-sales', isAdmin, createFlashSale);
router.put('/flash-sales/:id', isAdmin, updateFlashSale);
router.delete('/flash-sales/:id', isAdmin, deleteFlashSale);

// // Featured Deal Routes (Similar pattern)
router.get('/featured-deals', isAdmin, getAllFeaturedDeals);
router.get('/featured-deals/:id', isAdmin, getSingleFeaturedDeal);
router.post('/featured-deals', isAdmin, createFeaturedDeal);
router.put('/featured-deals/:id', isAdmin, updateFeaturedDeal);
router.delete('/featured-deals/:id', isAdmin, deleteFeaturedDeal);

// Clearance Deal Routes (Similar pattern)
router.get('/clearance-deals', isAdmin, getAllClearanceDeals);
router.get('/clearance-deals/:id', isAdmin, getSingleClearanceDeal);
router.post('/clearance-deals', isAdmin, createClearanceDeal);
router.put('/clearance-deals/:id', isAdmin, updateClearanceDeal);
router.delete('/clearance-deals/:id', isAdmin, deleteClearanceDeal);


router.get('/transactions', isAdmin, getTransactions);
router.get('/transactions/export', isAdmin, exportTransactions);


export default router;