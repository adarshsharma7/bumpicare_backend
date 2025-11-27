import User from "../models/user.model.js";
import Product from "../models/product.model.js";
import Order from "../models/order.model.js";
import Category from "../models/category.model.js";
import Review from "../models/review.model.js";
import Seller from "../models/seller.model.js";
import Tag from "../models/tag.model.js";
import ProductType from "../models/productType.model.js";
import OrderRequest from '../models/OrderRequest.js';
import Warehouse from '../models/Warehouse.js';
import Supplier from '../models/Supplier.js';
import InventoryMovement from '../models/InventoryMovement.js';
import Transaction from '../models/Transaction.js';
import Withdrawal from '../models/Withdrawal.js';
import { Parser } from 'json2csv';

import { ApiResponse } from "../utils/ApiResponse.js";
import { ApiError } from "../utils/ApiError.js";
import { asyncHandler } from "../utils/asyncHandler.js";
import mongoose from "mongoose";

// ==================== DASHBOARD ====================

// 📊 Get Dashboard Stats
export const getDashboardStats = async (req, res) => {
  try {
    // Total counts
    const totalUsers = await User.countDocuments({ role: "user" });
    const totalProducts = await Product.countDocuments();
    const totalOrders = await Order.countDocuments();

    // Revenue calculation
    const orders = await Order.find({ paymentStatus: "Paid" });
    const totalRevenue = orders.reduce((sum, order) => sum + order.totalAmount, 0);

    // Orders by status
    // const ordersByStatus = await Order.aggregate([
    //   {
    //     $group: {
    //       _id: "$orderStatus",
    //       count: { $sum: 1 },
    //     },
    //   },
    // ]);

    // Low stock products (stock < 10)
    const lowStockProducts = await Product.find({ stock: { $lt: 10 } })
      .select("name stock images category seller")
      .populate("category", "name")
      .limit(5);


    // Recent orders (last 10)
    const recentOrders = await Order.find()
      .populate("user", "name email phone")
      .populate("orderItems.product", "name images price")
      .sort({ createdAt: -1 })
      .limit(10);

    // Revenue by date (last 30 days)
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

    const revenueByDate = await Order.aggregate([
      {
        $match: {
          createdAt: { $gte: thirtyDaysAgo },
          paymentStatus: "Paid",
        },
      },
      {
        $group: {
          _id: { $dateToString: { format: "%Y-%m-%d", date: "$createdAt" } },
          revenue: { $sum: "$totalAmount" },
          orders: { $sum: 1 },
        },
      },
      { $sort: { _id: 1 } },
    ]);
    // --- Country-wise Trend Calculation ---

    // Dates
    const now = new Date();
    const firstDayCurrentMonth = new Date(now.getFullYear(), now.getMonth(), 1);
    const firstDayPrevMonth = new Date(now.getFullYear(), now.getMonth() - 1, 1);
    const lastDayPrevMonth = new Date(now.getFullYear(), now.getMonth(), 0);

    // Current month orders by country
    const countryCurrentMonth = await Order.aggregate([
      {
        $match: {
          createdAt: { $gte: firstDayCurrentMonth },
          paymentStatus: "Paid"
        }
      },
      {
        $group: {
          _id: "$shippingAddress.country",
          count: { $sum: 1 }
        }
      }
    ]);

    // Previous month orders by country
    const countryPrevMonth = await Order.aggregate([
      {
        $match: {
          createdAt: { $gte: firstDayPrevMonth, $lte: lastDayPrevMonth },
          paymentStatus: "Paid"
        }
      },
      {
        $group: {
          _id: "$shippingAddress.country",
          count: { $sum: 1 }
        }
      }
    ]);

    // Trend calculation
    const ordersByCountry = countryCurrentMonth.map(curr => {
      const prev = countryPrevMonth.find(p => p._id === curr._id)?.count || 0;
      const trend = curr.count > prev ? "up" : curr.count < prev ? "down" : "same";

      return {
        country: curr._id,
        currentOrders: curr.count,
        previousOrders: prev,
        trend
      };
    });

    // ---------- Order Fulfillment Status Dynamic -----------

    const shippedCount = await Order.countDocuments({ orderStatus: "Shipped" });
    const deliveredCount = await Order.countDocuments({ orderStatus: "Delivered" });
    const pendingCount = await Order.countDocuments({ orderStatus: "Pending" });
    // const processingCount = await Order.countDocuments({ orderStatus: "Processing" });
    // const cancelledCount = await Order.countDocuments({ orderStatus: "Cancelled" });

    // --- Stuck Orders (older than 5 days and not delivered) ---
    const fiveDaysAgo = new Date();
    fiveDaysAgo.setDate(fiveDaysAgo.getDate() - 5);

    const stuckOrders = await Order.countDocuments({
      createdAt: { $lte: fiveDaysAgo },
      orderStatus: { $ne: "Delivered" }
    });

    // --- Back Product (items ordered but lower stock in product) ---
    const allOrders = await Order.find().populate("orderItems.product");

    let backProduct = 0;

    allOrders.forEach(order => {
      order.orderItems.forEach(item => {
        if (item.quantity > (item.product?.stock || 0)) {
          backProduct++;
        }
      });
    });

    // Return final formatted object
    const orderFulfillment = [
      { label: "Shipped orders", count: shippedCount, color: "#3b82f6" },
      { label: "Delivered", count: deliveredCount, color: "#10b981" },
      { label: "Pending shipments", count: pendingCount, color: "#fbbf24" },
      // { label: "Pending", count: pendingCount, color: "#fbbf24" },
      // { label: "Cancelled", count: cancelledCount, color: "#ef4444" },
      { label: "Stuck orders", count: stuckOrders, color: "#1f2937" },
      { label: "Back Product", count: backProduct, color: "#f97316" }
    ];

    // Revenue Growth
    // This month revenue
    const revenueCurrentMonth = await Order.aggregate([
      { $match: { createdAt: { $gte: firstDayCurrentMonth }, paymentStatus: "Paid" } },
      { $group: { _id: null, total: { $sum: "$totalAmount" } } }
    ]);

    // Previous month revenue
    const revenuePrevMonth = await Order.aggregate([
      { $match: { createdAt: { $gte: firstDayPrevMonth, $lte: lastDayPrevMonth }, paymentStatus: "Paid" } },
      { $group: { _id: null, total: { $sum: "$totalAmount" } } }
    ]);

    const revCurr = revenueCurrentMonth[0]?.total || 0;
    const revPrev = revenuePrevMonth[0]?.total || 0;

    const revenueChange = revPrev === 0 ? 0 : ((revCurr - revPrev) / revPrev) * 100;

    //Orders Growth
    const ordersThisMonth = await Order.countDocuments({
      createdAt: { $gte: firstDayCurrentMonth }
    });
    const ordersLastMonth = await Order.countDocuments({
      createdAt: { $gte: firstDayPrevMonth, $lte: lastDayPrevMonth }
    });

    const ordersChange = ordersLastMonth === 0 ? 0 : ((ordersThisMonth - ordersLastMonth) / ordersLastMonth) * 100;

    // user Growth
    const usersThisMonth = await User.countDocuments({ createdAt: { $gte: firstDayCurrentMonth } });
    const usersLastMonth = await User.countDocuments({ createdAt: { $gte: firstDayPrevMonth, $lte: lastDayPrevMonth } });

    const usersChange = usersLastMonth === 0 ? 0 : ((usersThisMonth - usersLastMonth) / usersLastMonth) * 100;

    //Product Growth
    const productsThisMonth = await Product.countDocuments({ createdAt: { $gte: firstDayCurrentMonth } });
    const productsLastMonth = await Product.countDocuments({ createdAt: { $gte: firstDayPrevMonth, $lte: lastDayPrevMonth } });

    const productsChange = productsLastMonth === 0 ? 0 : ((productsThisMonth - productsLastMonth) / productsLastMonth) * 100;

    // Order status list manually define (ensure all exist)
    // ---- Time helpers ----
    const sevenDaysAgo = new Date();
    sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);



    // ---- Fetch all orders ----
    const Orders = await Order.find().populate("orderItems.product");

    // ---- Counts ----

    // New Shipment = Shipped
    const newShipment = Orders.filter(o => o.orderStatus === "Shipped").length;

    // Processing = Pending Shipments
    const processing = Orders.filter(o => o.orderStatus === "Processing").length;

    // Delivered
    const delivered = Orders.filter(o => o.orderStatus === "Delivered").length;

    // Cancelled
    const cancelled = Orders.filter(o => o.orderStatus == "Cancelled").length;

    // Failed Delivery = shipped but not delivered for 7+ days
    const failedDelivery = Orders.filter(o =>
      o.orderStatus === "Shipped" &&
      o.createdAt <= sevenDaysAgo
    ).length;

    // Returned = delivered + refund initiated
    const returned = Orders.filter(o =>
      o.orderStatus === "Delivered" &&
      o.paymentStatus === "Refund Initiated"
    ).length;

    // Refunded = paymentStatus refunded
    const refunded = Orders.filter(o =>
      o.refundStatus == "Refund Initiated"
    ).length;


    // Final clean array (IN SAME ORDER as frontend)
    const ordersByStatus = [
      { status: "New Shipment", count: newShipment },
      { status: "Processing", count: processing },
      { status: "Delivered", count: delivered },
      { status: "Cancelled", count: cancelled },
      { status: "Failed Delivery", count: failedDelivery },
      { status: "Pending shipments", count: pendingCount }, // same as processing
      { status: "Returned", count: returned },
      { status: "Refunded", count: refunded },
      { status: "Stuck orders", count: stuckOrders }
    ];

    res.status(200).json({
      success: true,
      data: {
        totalUsers,
        totalProducts,
        totalOrders,
        totalRevenue,
        ordersByStatus,
        ordersByCountry,
        orderFulfillment,
        lowStockProducts,
        recentOrders,
        revenueByDate,
        growth: {
          revenue: revenueChange,
          orders: ordersChange,
          users: usersChange,
          products: productsChange,
        },
      },

    });
  } catch (error) {
    console.error("Dashboard stats error:", error);
    res.status(500).json({ success: false, message: "Internal server error" });
  }
};

// ==================== USERS ====================

// 👥 Get All Users
export const getAllUsers = async (req, res) => {
  try {
    const { search, page = 1, limit = 20 } = req.query;
    const query = { role: "user" };

    if (search) {
      query.$or = [
        { name: { $regex: search, $options: "i" } },
        { email: { $regex: search, $options: "i" } },
        { phone: { $regex: search, $options: "i" } },
      ];
    }

    const users = await User.find(query)
      .select("-password")
      .sort({ createdAt: -1 })
      .limit(limit * 1)
      .skip((page - 1) * limit);

    const total = await User.countDocuments(query);

    res.status(200).json({
      success: true,
      data: users,
      pagination: {
        total,
        page: Number(page),
        pages: Math.ceil(total / limit),
      },
    });
  } catch (error) {
    console.error("Get users error:", error);
    res.status(500).json({ success: false, message: "Internal server error" });
  }
};

//  Get All Admins
export const getAllAdmins = async (req, res) => {
  try {
    const { search, page = 1, limit = 20 } = req.query;

    const query = { role: "admin" };

    if (search) {
      query.$or = [
        { name: { $regex: search, $options: "i" } },
        { email: { $regex: search, $options: "i" } },
        { phone: { $regex: search, $options: "i" } },
      ];
    }

    const admins = await User.find(query)
      .select("-password")
      .sort({ createdAt: -1 })
      .limit(limit * 1)
      .skip((page - 1) * limit);

    const total = await User.countDocuments(query);

    res.status(200).json({
      success: true,
      data: admins,
      pagination: {
        total,
        page: Number(page),
        pages: Math.ceil(total / limit),
      },
    });
  } catch (error) {
    console.error("Get admins error:", error);
    res.status(500).json({
      success: false,
      message: "Internal server error",
    });
  }
};

// ==================== GET SINGLE PRODUCT ====================
export const getSingleProduct = async (req, res) => {
  try {
    const { id } = req.params;

    const product = await Product.findById(id)
      .populate('category', 'name')
      .populate('seller', 'name shopName') // ✅ Seller fields
      .populate('productType', 'name')     // ✅ ProductType
      .populate('tags', 'name color');     // ✅ Tags with color

    if (!product) {
      return res.status(404).json({
        success: false,
        message: 'Product not found'
      });
    }

    return res.status(200).json({
      success: true,
      data: product
    });
  } catch (error) {
    console.error('Get product error:', error);
    return res.status(500).json({
      success: false,
      message: error.message || 'Internal server error'
    });
  }
};

// GET list (simple)
export const listProducts = async (req, res) => {
  try {
    const products = await Product.find().sort({ createdAt: -1 }).limit(200).populate('category', 'name');
    return res.status(200).json({ success: true, data: products });
  } catch (error) {
    console.error('List products error:', error);
    return res.status(500).json({ success: false, message: error.message || 'Internal server error' });
  }
};

// 👤 Get Single User Details
export const getUserDetails = async (req, res) => {
  try {
    const { id } = req.params;

    const user = await User.findById(id)
      .select("-password")
      .populate("wishlist", "name images price")
      .populate("cart.product");

    if (!user) {
      return res.status(404).json({ success: false, message: "User not found" });
    }

    // Get user's orders
    const orders = await Order.find({ user: id })
      .populate("orderItems.product", "name images")
      .sort({ createdAt: -1 });

    res.status(200).json({
      success: true,
      data: { user, orders },
    });
  } catch (error) {
    console.error("Get user details error:", error);
    res.status(500).json({ success: false, message: "Internal server error" });
  }
};

// 🚫 Block/Unblock User (Optional - add isBlocked field to User model)
export const toggleUserStatus = async (req, res) => {
  try {
    const { id } = req.params;
    const user = await User.findById(id);

    if (!user) {
      return res.status(404).json({ success: false, message: "User not found" });
    }

    // Toggle isBlocked status (add this field to User model if needed)
    user.isBlocked = !user.isBlocked;
    await user.save();

    res.status(200).json({
      success: true,
      message: `User ${user.isBlocked ? "blocked" : "unblocked"} successfully`,
      data: user,
    });
  } catch (error) {
    console.error("Toggle user status error:", error);
    res.status(500).json({ success: false, message: "Internal server error" });
  }
};
export const getRecentOrders = async (req, res) => {
  try {
    const page = Number(req.query.page) || 1;
    const limit = 10;
    const skip = (page - 1) * limit;

    const orders = await Order.find()
      .populate("user", "name")
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit);

    const total = await Order.countDocuments();

    res.json({
      orders,
      totalPages: Math.ceil(total / limit),
      currentPage: page,
    });
  } catch (err) {
    console.log(err);
    res.status(500).json({ message: "Server error" });
  }
};


// Admin: Cancel Order
export const cancelOrderByAdmin = async (req, res) => {

  try {
    const { orderId } = req.params;
    const order = await Order.findById(orderId);
    if (!order) {
      return res.status(404).json({ message: "Order not found" });
    }

    if (order.orderStatus === "Cancelled") {
      return res.status(400).json({ message: "Already cancelled" });
    }

    order.orderStatus = "Cancelled";
    await order.save();

    res.json({ message: "Order cancelled successfully", order });
  } catch (err) {
    console.log(err);
    res.status(500).json({ message: "Server error" });
  }
};


// ==================== PRODUCTS ====================

// 📦 Get All Products (Admin + Filters + Pagination)
export const getAdminProducts = async (req, res) => {
  try {
    let {
      search = "",
      category,
      seller,
      isActive,
      page = 1,
      limit = 10,
      sort = '-createdAt'
    } = req.query;

    page = Number(page);
    limit = Number(limit);

    const query = {};

    // 🔍 Enhanced Search - search in name, brand, description
    if (search.trim() !== "") {
      query.$or = [
        { name: { $regex: search, $options: "i" } },
        { brand: { $regex: search, $options: "i" } },
        { description: { $regex: search, $options: "i" } },
      ];
    }

    // 🎯 Filter by category
    if (category && category !== "all") {
      query.category = category;
    }

    // 👤 Filter by seller
    if (seller && seller !== "all") {
      query.seller = seller;
    }

    // 🟢 Filter by active/inactive
    if (isActive === "true") {
      query.isActive = true;
    } else if (isActive === "false") {
      query.isActive = false;
    }

    // 📊 Count total matching products
    const total = await Product.countDocuments(query);

    // 🎁 Fetch Products with populated fields
    const products = await Product.find(query)
      .populate("category", "name")
      .populate("seller", "name shopName email")
      .populate("productType", "name")
      .sort(sort)
      .skip((page - 1) * limit)
      .limit(limit);

    // 📄 Calculate pagination
    const totalPages = Math.ceil(total / limit);

    res.status(200).json({
      success: true,
      data: products,
      pagination: {
        total,
        page,
        limit,
        totalPages,
        hasNextPage: page < totalPages,
        hasPreviousPage: page > 1,
      },
    });

  } catch (error) {
    console.error("Admin get products error:", error);
    res.status(500).json({
      success: false,
      message: "Internal server error",
    });
  }
};


// 🔄 Toggle Product Status
export const toggleProductStatus = async (req, res) => {
  try {
    const { id } = req.params;

    const product = await Product.findById(id);

    if (!product) {
      return res.status(404).json({
        success: false,
        message: "Product not found",
      });
    }

    product.isActive = !product.isActive;
    await product.save();

    res.status(200).json({
      success: true,
      message: `Product ${product.isActive ? "activated" : "deactivated"} successfully`,
      data: {
        _id: product._id,
        isActive: product.isActive,
      },
    });
  } catch (error) {
    console.error("Toggle product status error:", error);
    res.status(500).json({
      success: false,
      message: "Internal server error",
    });
  }
};


// 📊 Bulk Update Stock
export const bulkUpdateStock = async (req, res) => {
  try {
    const { updates } = req.body; // [{ productId, stock }]

    if (!Array.isArray(updates) || updates.length === 0) {
      return res.status(400).json({
        success: false,
        message: "No updates provided",
      });
    }

    const bulkOps = updates.map(item => ({
      updateOne: {
        filter: { _id: item.productId },
        update: { $set: { stock: item.stock } },
      },
    }));

    await Product.bulkWrite(bulkOps);

    res.status(200).json({
      success: true,
      message: "Stock updated successfully",
    });

  } catch (error) {
    console.error("Bulk stock update error:", error);
    res.status(500).json({
      success: false,
      message: "Internal server error",
    });
  }
};

// ==================== ADD PRODUCT ====================
export const addProduct = async (req, res) => {
  try {
    const admin = req.user;
    if (!admin || admin.role !== 'admin') {
      return res.status(403).json({ success: false, message: 'Unauthorized. Admin access required.' });
    }

    const {
      name,
      slug,
      description,
      price,
      discountPrice,
      category,
      stock,
      images,
      brand,
      colors,
      sizes,
      specifications,
      keyInfo,
      sizeGuide,
      seller,
      variants,
      discounts,
      tags,
      coverPhoto,
      videos,
      productType,
      isActive,
      status,        // ✅ NEW
      isDraft,       // ✅ NEW
    } = req.body;

    // ✅ Relax validation for draft products
    if (!isDraft && (!name || !price || !category)) {
      return res.status(400).json({
        success: false,
        message: 'Name, price, and category are required for published products'
      });
    }

    // ✅ Minimum validation for draft
    if (isDraft && !name) {
      return res.status(400).json({
        success: false,
        message: 'Product name is required even for drafts'
      });
    }

    const product = await Product.create({
      name,
      slug: slug || name.toLowerCase().replace(/\s+/g, '-'),
      description,
      price: price || 0,
      discountPrice: discountPrice || null,
      category: category || null,
      stock: stock || 0,
      images: images || [],
      coverPhoto: coverPhoto || '',
      videos: videos || [],
      brand: brand || 'Generic',
      colors: colors || [],
      sizes: sizes || [],
      specifications: specifications || [],
      keyInfo: keyInfo || [],
      sizeGuide: sizeGuide || '',
      seller: seller || null,
      variants: variants || [],
      discounts: discounts || [],
      tags: tags || [],
      productType: productType || null,
      isActive: isDraft ? false : (isActive !== undefined ? isActive : true), // ✅ Draft products are inactive
      status: status || (isDraft ? 'draft' : 'published'), // ✅ Set status
      isDraft: isDraft || false, // ✅ Set draft flag
      publishedAt: isDraft ? null : new Date(), // ✅ Set publish date only if not draft
    });

    await product.populate('category', 'name');
    await product.populate('seller', 'name shopName');
    await product.populate('productType', 'name');
    await product.populate('tags', 'name color');

    return res.status(201).json({
      success: true,
      message: isDraft ? 'Product saved as draft' : 'Product published successfully',
      data: product
    });
  } catch (error) {
    console.error('Add product error:', error);
    return res.status(500).json({ success: false, message: error.message || 'Internal server error' });
  }
};


// ==================== UPDATE PRODUCT ====================
export const updateProduct = async (req, res) => {
  try {
    const admin = req.user;
    if (!admin || admin.role !== 'admin') {
      return res.status(403).json({ success: false, message: 'Unauthorized. Admin access required.' });
    }

    const { id } = req.params;
    const product = await Product.findById(id);
    if (!product) return res.status(404).json({ success: false, message: 'Product not found' });

    const payload = req.body;

    // ✅ Add new allowed fields
    const allowed = [
      'name', 'slug', 'description', 'price', 'discountPrice', 'category', 'stock',
      'images', 'brand', 'colors', 'sizes', 'specifications', 'keyInfo', 'sizeGuide',
      'seller', 'variants', 'discounts', 'tags', 'coverPhoto', 'videos', 'productType',
      'isActive', 'status', 'isDraft' // ✅ NEW FIELDS
    ];

    // ✅ Handle status change from draft to published
    if (payload.isDraft === false && product.isDraft === true) {
      payload.publishedAt = new Date();
      payload.status = 'published';
      payload.isActive = true;
    }

    // ✅ Handle save as draft (published → draft)
    if (payload.isDraft === true) {
      payload.status = 'draft';
      payload.isActive = false;
      payload.publishedAt = null;
    }

    allowed.forEach((key) => {
      if (payload[key] !== undefined) product[key] = payload[key];
    });

    await product.save();
    await product.populate('category', 'name');
    await product.populate('seller', 'name shopName');
    await product.populate('productType', 'name');
    await product.populate('tags', 'name color');

    return res.status(200).json({
      success: true,
      message: product.isDraft ? 'Product saved as draft' : 'Product updated successfully',
      data: product
    });
  } catch (error) {
    console.error('Update product error:', error);
    return res.status(500).json({ success: false, message: error.message || 'Internal server error' });
  }
};

// ==================== GET DRAFT PRODUCTS ====================
export const getDraftProducts = async (req, res) => {
  try {
    const { search, category, seller, sort = '-createdAt' } = req.query;

    let filter = { isDraft: true }; // ✅ Only draft products

    // Search
    if (search) {
      filter.$or = [
        { name: { $regex: search, $options: 'i' } },
        { brand: { $regex: search, $options: 'i' } },
      ];
    }

    // Category filter
    if (category && mongoose.Types.ObjectId.isValid(category)) {
      filter.category = category;
    }

    // Seller filter
    if (seller && mongoose.Types.ObjectId.isValid(seller)) {
      filter.seller = seller;
    }

    const products = await Product.find(filter)
      .populate('category', 'name')
      .populate('seller', 'name shopName')
      .populate('productType', 'name')
      .populate('tags', 'name color')
      .sort(sort);

    // ✅ Calculate completion percentage for each product
    const productsWithCompletion = products.map(product => {
      const requiredFields = [
        product.name,
        product.price,
        product.category,
        product.description,
        product.coverPhoto || product.images?.length,
        product.stock,
      ];

      const filledFields = requiredFields.filter(field => {
        if (typeof field === 'number') return field > 0;
        if (Array.isArray(field)) return field.length > 0;
        return !!field;
      }).length;

      const completionPercentage = Math.round((filledFields / requiredFields.length) * 100);

      // ✅ Find missing fields
      const missingFields = [];
      if (!product.name) missingFields.push('name');
      if (!product.price || product.price === 0) missingFields.push('price');
      if (!product.category) missingFields.push('category');
      if (!product.description) missingFields.push('description');
      if (!product.coverPhoto && (!product.images || product.images.length === 0)) missingFields.push('images');
      if (!product.stock || product.stock === 0) missingFields.push('stock');

      return {
        ...product.toObject(),
        completionPercentage,
        missingFields,
      };
    });

    return res.status(200).json({
      success: true,
      data: productsWithCompletion,
      count: productsWithCompletion.length,
    });
  } catch (error) {
    console.error('Get draft products error:', error);
    return res.status(500).json({
      success: false,
      message: error.message || 'Internal server error',
    });
  }
};

// ==================== PUBLISH DRAFT PRODUCT ====================
export const publishDraftProduct = async (req, res) => {
  try {
    const admin = req.user;
    if (!admin || admin.role !== 'admin') {
      return res.status(403).json({
        success: false,
        message: 'Unauthorized. Admin access required.'
      });
    }

    const { id } = req.params;
    const product = await Product.findById(id);

    if (!product) {
      return res.status(404).json({
        success: false,
        message: 'Product not found'
      });
    }

    if (!product.isDraft) {
      return res.status(400).json({
        success: false,
        message: 'Product is already published'
      });
    }

    // ✅ Validate required fields before publishing
    if (!product.name || !product.price || !product.category) {
      return res.status(400).json({
        success: false,
        message: 'Cannot publish: Product must have name, price, and category'
      });
    }

    // ✅ Update to published
    product.isDraft = false;
    product.status = 'published';
    product.isActive = true;
    product.publishedAt = new Date();

    await product.save();
    await product.populate('category', 'name');
    await product.populate('seller', 'name shopName');

    return res.status(200).json({
      success: true,
      message: 'Product published successfully',
      data: product
    });
  } catch (error) {
    console.error('Publish draft product error:', error);
    return res.status(500).json({
      success: false,
      message: error.message || 'Internal server error'
    });
  }
};

// ==================== DELETE PRODUCT ====================
export const deleteProduct = async (req, res) => {
  try {
    const admin = req.user;

    if (!admin || admin.role !== "admin") {
      return res.status(403).json({
        success: false,
        message: "Unauthorized. Admin access required.",
      });
    }

    const { id } = req.params;

    const deleted = await Product.findByIdAndDelete(id);
    if (!deleted) {
      return res.status(404).json({
        success: false,
        message: "Product not found",
      });
    }

    return res.status(200).json({
      success: true,
      message: "Product deleted successfully",
      data: null,
    });
  } catch (error) {
    console.error("Delete product error:", error);
    return res.status(500).json({
      success: false,
      message: error.message || "Internal server error",
    });
  }
};

// ==================== ORDERS ====================

// 🛒 Get All Orders (Admin view)
export const getAdminOrders = async (req, res) => {
  try {
    const { status, paymentMethod, search, page = 1, limit = 20 } = req.query;
    const query = {};

    if (status) {
      query.orderStatus = status;
    }

    if (paymentMethod) {
      query.paymentMethod = paymentMethod;
    }

    const orders = await Order.find(query)
      .populate("user", "name email phone")
      .populate("orderItems.product", "name images price")
      .sort({ createdAt: -1 })
      .limit(limit * 1)
      .skip((page - 1) * limit);

    const total = await Order.countDocuments(query);

    res.status(200).json({
      success: true,
      data: orders,
      pagination: {
        total,
        page: Number(page),
        pages: Math.ceil(total / limit),
      },
    });
  } catch (error) {
    console.error("Get admin orders error:", error);
    res.status(500).json({ success: false, message: "Internal server error" });
  }
};

// 📊 Get Order Stats (for dashboard cards)
export const getOrderStats = async (req, res) => {
  try {
    const total = await Order.countDocuments();
    const pendingPayment = await Order.countDocuments({ paymentStatus: 'pending' });
    const processing = await Order.countDocuments({ orderStatus: 'Processing' });
    const shipped = await Order.countDocuments({ orderStatus: 'Shipped' });
    const delivered = await Order.countDocuments({ orderStatus: 'Delivered' });
    const cancelled = await Order.countDocuments({ orderStatus: 'Cancelled' });
    const returned = await Order.countDocuments({ orderStatus: 'Returned' });
    const failed = await Order.countDocuments({ orderStatus: 'Failed' });

    res.status(200).json({
      success: true,
      data: {
        total,
        pendingPayment,
        processing,
        shipped,
        delivered,
        cancelled,
        returned,
        failed,
      },
    });
  } catch (error) {
    console.error("Get order stats error:", error);
    res.status(500).json({ success: false, message: "Internal server error" });
  }
};

// 📊 Get Order Chart Data
export const getOrderChartData = async (req, res) => {
  try {
    const { period = '12months' } = req.query;

    let startDate = new Date();
    let groupByFormat;
    let labels = [];

    // Determine date range and grouping based on period
    switch (period) {
      case '24hours':
        startDate.setHours(startDate.getHours() - 24);
        groupByFormat = '%H:00'; // Group by hour
        for (let i = 0; i < 24; i++) {
          labels.push(`${i}:00`);
        }
        break;

      case '7days':
        startDate.setDate(startDate.getDate() - 7);
        groupByFormat = '%Y-%m-%d'; // Group by day
        const daysOfWeek = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
        for (let i = 6; i >= 0; i--) {
          const date = new Date();
          date.setDate(date.getDate() - i);
          labels.push(daysOfWeek[date.getDay()]);
        }
        break;

      case '30days':
        startDate.setDate(startDate.getDate() - 30);
        groupByFormat = '%Y-%m-%d'; // Group by day
        for (let i = 29; i >= 0; i--) {
          const date = new Date();
          date.setDate(date.getDate() - i);
          labels.push(date.getDate().toString());
        }
        break;

      case '12months':
      default:
        startDate.setMonth(startDate.getMonth() - 12);
        groupByFormat = '%Y-%m'; // Group by month
        const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
        for (let i = 11; i >= 0; i--) {
          const date = new Date();
          date.setMonth(date.getMonth() - i);
          labels.push(months[date.getMonth()]);
        }
        break;
    }

    // Aggregate orders data
    const aggregatedData = await Order.aggregate([
      {
        $match: {
          createdAt: { $gte: startDate },
          orderStatus: { $ne: 'Cancelled' }
        }
      },
      {
        $group: {
          _id: {
            $dateToString: { format: groupByFormat, date: '$createdAt' }
          },
          earnings: { $sum: '$totalAmount' },
          count: { $sum: 1 }
        }
      },
      {
        $sort: { _id: 1 }
      }
    ]);

    // Map aggregated data to labels
    const dataMap = {};
    aggregatedData.forEach(item => {
      dataMap[item._id] = {
        earnings: item.earnings,
        profits: Math.round(item.earnings * 0.3) // 30% profit margin
      };
    });

    // Create chart data array
    const chartData = labels.map((label, index) => {
      let key;
      const now = new Date();

      switch (period) {
        case '24hours':
          key = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`;
          break;
        case '7days':
        case '30days':
          const date = new Date();
          date.setDate(date.getDate() - (labels.length - 1 - index));
          key = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
          break;
        case '12months':
        default:
          const monthDate = new Date();
          monthDate.setMonth(monthDate.getMonth() - (labels.length - 1 - index));
          key = `${monthDate.getFullYear()}-${String(monthDate.getMonth() + 1).padStart(2, '0')}`;
          break;
      }

      return {
        name: label,
        earnings: dataMap[key]?.earnings || 0,
        profits: dataMap[key]?.profits || 0
      };
    });

    res.status(200).json({
      success: true,
      data: chartData,
      period
    });
  } catch (error) {
    console.error("Get order chart data error:", error);
    res.status(500).json({ success: false, message: "Internal server error" });
  }
};

// 📝 Get Order Details
export const getOrderDetails = async (req, res) => {
  try {
    const { id } = req.params;

    const order = await Order.findById(id)
      .populate("user", "name email phone")
      .populate("orderItems.product", "name images price");

    if (!order) {
      return res.status(404).json({ success: false, message: "Order not found" });
    }

    res.status(200).json({
      success: true,
      data: order,
    });
  } catch (error) {
    console.error("Get order details error:", error);
    res.status(500).json({ success: false, message: "Internal server error" });
  }
};

// 🔄 Update Order Status (Admin)
export const updateOrderStatusAdmin = async (req, res) => {
  try {
    const { id } = req.params;
    const { orderStatus } = req.body;

    const order = await Order.findById(id);
    if (!order) {
      return res.status(404).json({ success: false, message: "Order not found" });
    }

    order.orderStatus = orderStatus;
    await order.save();

    res.status(200).json({
      success: true,
      message: "Order status updated successfully",
      data: order,
    });
  } catch (error) {
    console.error("Update order status error:", error);
    res.status(500).json({ success: false, message: "Internal server error" });
  }
};

// ==================== CATEGORIES ====================

// 📂 Get All Categories
export const getAllCategories = async (req, res) => {
  try {
    const categories = await Category.find().sort({ createdAt: -1 });

    res.status(200).json({
      success: true,
      data: categories,
    });
  } catch (error) {
    console.error("Get categories error:", error);
    res.status(500).json({ success: false, message: "Internal server error" });
  }
};

// ➕ Add Category
export const addCategory = async (req, res) => {
  try {
    const { name, description, image } = req.body;

    if (!name) {
      return res.status(400).json({ success: false, message: "Name is required" });
    }

    const existingCategory = await Category.findOne({ name });
    if (existingCategory) {
      return res.status(400).json({ success: false, message: "Category already exists" });
    }

    const category = await Category.create({ name, description, image });

    res.status(201).json({
      success: true,
      message: "Category added successfully",
      data: category,
    });
  } catch (error) {
    console.error("Add category error:", error);
    res.status(500).json({ success: false, message: "Internal server error" });
  }
};

// ✏️ Update Category
export const updateCategory = async (req, res) => {
  try {
    const { id } = req.params;
    const { name, description, image } = req.body;

    const category = await Category.findByIdAndUpdate(
      id,
      { name, description, image },
      { new: true, runValidators: true }
    );

    if (!category) {
      return res.status(404).json({ success: false, message: "Category not found" });
    }

    res.status(200).json({
      success: true,
      message: "Category updated successfully",
      data: category,
    });
  } catch (error) {
    console.error("Update category error:", error);
    res.status(500).json({ success: false, message: "Internal server error" });
  }
};

// 🗑️ Delete Category
export const deleteCategory = async (req, res) => {
  try {
    const { id } = req.params;

    // Check if any products use this category
    const productsCount = await Product.countDocuments({ category: id });
    if (productsCount > 0) {
      return res.status(200).json({
        success: false,
        message: `Cannot delete. ${productsCount} product(s) use this category`,
      });
    }

    const category = await Category.findByIdAndDelete(id);
    if (!category) {
      return res.status(404).json({ success: false, message: "Category not found" });
    }

    res.status(200).json({
      success: true,
      message: "Category deleted successfully",
    });
  } catch (error) {
    console.error("Delete category error:", error);
    res.status(500).json({ success: false, message: "Internal server error" });
  }
};

// ==================== REVIEWS ====================

// ⭐ Get All Reviews (Enhanced with search & filters)
export const getAllReviews = async (req, res) => {
  try {
    const {
      productId,
      userId,
      rating,
      search,
      page = 1,
      limit = 20,
      sortBy = 'createdAt',
      sortOrder = 'desc'
    } = req.query;

    // Build query
    const query = {};

    if (productId) {
      query.product = productId;
    }

    if (userId) {
      query.user = userId;
    }

    if (rating) {
      query.rating = parseInt(rating);
    }

    // Search in comment
    if (search) {
      query.$or = [
        { comment: { $regex: search, $options: 'i' } }
      ];
    }

    // Sorting
    const sort = {};
    sort[sortBy] = sortOrder === 'desc' ? -1 : 1;

    // Fetch reviews
    const reviews = await Review.find(query)
      .populate("user", "name email avatar")
      .populate("product", "name images price")
      .sort(sort)
      .limit(limit * 1)
      .skip((page - 1) * limit);

    const total = await Review.countDocuments(query);

    // Calculate average rating
    const avgRating = await Review.aggregate([
      { $match: query },
      { $group: { _id: null, averageRating: { $avg: "$rating" } } }
    ]);

    res.status(200).json({
      success: true,
      data: reviews,
      averageRating: avgRating[0]?.averageRating || 0,
      pagination: {
        total,
        page: Number(page),
        pages: Math.ceil(total / limit),
      },
    });
  } catch (error) {
    console.error("Get reviews error:", error);
    res.status(500).json({ success: false, message: "Internal server error" });
  }
};

// 👁️ Get Single Review Detail
export const getReviewById = async (req, res) => {
  try {
    const { id } = req.params;

    const review = await Review.findById(id)
      .populate("user", "name email avatar phone")
      .populate("product", "name images price description");

    if (!review) {
      return res.status(404).json({
        success: false,
        message: "Review not found"
      });
    }

    res.status(200).json({
      success: true,
      data: review,
    });
  } catch (error) {
    console.error("Get review error:", error);
    res.status(500).json({ success: false, message: "Internal server error" });
  }
};

// 🗑️ Delete Single Review (Enhanced)
export const deletesReview = async (req, res) => {
  try {
    const { id } = req.params;

    const review = await Review.findByIdAndDelete(id);
    if (!review) {
      return res.status(404).json({
        success: false,
        message: "Review not found"
      });
    }

    // Update product ratings
    await updateProductRating(review.product);

    res.status(200).json({
      success: true,
      message: "Review deleted successfully",
    });
  } catch (error) {
    console.error("Delete review error:", error);
    res.status(500).json({ success: false, message: "Internal server error" });
  }
};

// ============================================
// 📁 reviewController.js - Product-wise System
// ============================================

// 📦 Get Products with Review Counts & Stats
export const getProductsWithReviews = async (req, res) => {
  try {
    const { search, page = 1, limit = 20 } = req.query;

    // Build product query
    let productQuery = { isActive: true };
    if (search) {
      productQuery.name = { $regex: search, $options: 'i' };
    }

    // Get products
    const products = await Product.find(productQuery)
      .select('name images')
      .limit(limit * 1)
      .skip((page - 1) * limit);

    const total = await Product.countDocuments(productQuery);

    // Get review stats for each product
    const productsWithStats = await Promise.all(
      products.map(async (product) => {
        // Count reviews
        const reviewCount = await Review.countDocuments({ product: product._id });

        // Get average rating
        const avgRating = await Review.aggregate([
          { $match: { product: product._id } },
          { $group: { _id: null, average: { $avg: "$rating" } } }
        ]);

        // Get rating distribution
        const ratingDist = await Review.aggregate([
          { $match: { product: product._id } },
          { $group: { _id: "$rating", count: { $sum: 1 } } }
        ]);

        // Format rating distribution
        const ratingDistribution = { 5: 0, 4: 0, 3: 0, 2: 0, 1: 0 };
        ratingDist.forEach(r => {
          ratingDistribution[r._id] = r.count;
        });

        // Check if any review has images
        const hasImages = await Review.exists({
          product: product._id,
          'images.0': { $exists: true }
        });

        return {
          _id: product._id,
          name: product.name,
          image: product.images?.[0] || null,
          reviewCount,
          averageRating: avgRating[0]?.average || 0,
          ratingDistribution,
          hasImages: !!hasImages
        };
      })
    );

    // Sort by review count (most reviews first)
    productsWithStats.sort((a, b) => b.reviewCount - a.reviewCount);

    // Calculate overall stats
    const totalReviews = await Review.countDocuments();
    const overallAvgRating = await Review.aggregate([
      { $group: { _id: null, average: { $avg: "$rating" } } }
    ]);

    res.status(200).json({
      success: true,
      data: productsWithStats,
      totalProducts: total,
      totalReviews,
      averageRating: overallAvgRating[0]?.average || 0,
      pagination: {
        page: Number(page),
        limit: Number(limit),
        total,
        pages: Math.ceil(total / limit),
      },
    });
  } catch (error) {
    console.error("Get products with reviews error:", error);
    res.status(500).json({ success: false, message: "Internal server error" });
  }
};

// ⭐ Get All Reviews for a Specific Product
export const getProductReviews = async (req, res) => {
  try {
    const { productId } = req.query;

    if (!productId) {
      return res.status(400).json({
        success: false,
        message: "Product ID is required"
      });
    }

    const reviews = await Review.find({ product: productId })
      .populate("user", "name email avatar")
      .populate("product", "name images")
      .sort({ createdAt: -1 });

    // Get product stats
    const product = await Product.findById(productId).select('name images');

    const avgRating = await Review.aggregate([
      { $match: { product: productId } },
      { $group: { _id: null, average: { $avg: "$rating" } } }
    ]);

    const ratingDist = await Review.aggregate([
      { $match: { product: productId } },
      { $group: { _id: "$rating", count: { $sum: 1 } } }
    ]);

    const ratingDistribution = { 5: 0, 4: 0, 3: 0, 2: 0, 1: 0 };
    ratingDist.forEach(r => {
      ratingDistribution[r._id] = r.count;
    });

    res.status(200).json({
      success: true,
      data: reviews,
      product: {
        _id: product._id,
        name: product.name,
        image: product.images?.[0],
        reviewCount: reviews.length,
        averageRating: avgRating[0]?.average || 0,
        ratingDistribution
      }
    });
  } catch (error) {
    console.error("Get product reviews error:", error);
    res.status(500).json({ success: false, message: "Internal server error" });
  }
};
// 🔧 Helper Function: Update Product Rating
async function updateProductRating(productId) {
  try {
    const product = await Product.findById(productId);
    if (!product) return;

    const reviews = await Review.find({ product: productId });

    product.reviewsCount = reviews.length;
    product.ratings = reviews.length > 0
      ? reviews.reduce((sum, r) => sum + r.rating, 0) / reviews.length
      : 0;

    await product.save();
  } catch (error) {
    console.error("Update product rating error:", error);
  }
}

// 🗑️ Delete Review
export const deleteReview = async (req, res) => {
  try {
    const { id } = req.params;

    const review = await Review.findByIdAndDelete(id);
    if (!review) {
      return res.status(404).json({
        success: false,
        message: "Review not found"
      });
    }

    // Update product ratings
    await updateProductRating(review.product);

    res.status(200).json({
      success: true,
      message: "Review deleted successfully",
    });
  } catch (error) {
    console.error("Delete review error:", error);
    res.status(500).json({ success: false, message: "Internal server error" });
  }
};


// 🗑️ Bulk Delete Reviews (NEW)
export const bulkDeleteReviews = async (req, res) => {
  try {
    const { ids } = req.body;

    if (!ids || !Array.isArray(ids) || ids.length === 0) {
      return res.status(400).json({
        success: false,
        message: "Please provide review IDs to delete"
      });
    }

    // Get reviews to update their products
    const reviews = await Review.find({ _id: { $in: ids } });
    const productIds = [...new Set(reviews.map(r => r.product.toString()))];

    // Delete reviews
    await Review.deleteMany({ _id: { $in: ids } });

    // Update all affected products
    for (const productId of productIds) {
      await updateProductRating(productId);
    }

    res.status(200).json({
      success: true,
      message: `${ids.length} reviews deleted successfully`,
    });
  } catch (error) {
    console.error("Bulk delete error:", error);
    res.status(500).json({ success: false, message: "Internal server error" });
  }
};

// 📊 Get Review Statistics (NEW)
export const getReviewStats = async (req, res) => {
  try {
    const { productId } = req.query;
    const match = productId ? { product: productId } : {};

    const stats = await Review.aggregate([
      { $match: match },
      {
        $group: {
          _id: "$rating",
          count: { $sum: 1 }
        }
      },
      { $sort: { _id: -1 } }
    ]);

    const total = await Review.countDocuments(match);
    const avgRating = await Review.aggregate([
      { $match: match },
      { $group: { _id: null, average: { $avg: "$rating" } } }
    ]);

    // Format stats
    const ratingDistribution = {
      5: 0,
      4: 0,
      3: 0,
      2: 0,
      1: 0
    };

    stats.forEach(stat => {
      ratingDistribution[stat._id] = stat.count;
    });

    res.status(200).json({
      success: true,
      data: {
        total,
        averageRating: avgRating[0]?.average || 0,
        distribution: ratingDistribution,
        percentages: {
          5: total ? ((ratingDistribution[5] / total) * 100).toFixed(1) : 0,
          4: total ? ((ratingDistribution[4] / total) * 100).toFixed(1) : 0,
          3: total ? ((ratingDistribution[3] / total) * 100).toFixed(1) : 0,
          2: total ? ((ratingDistribution[2] / total) * 100).toFixed(1) : 0,
          1: total ? ((ratingDistribution[1] / total) * 100).toFixed(1) : 0,
        }
      }
    });
  } catch (error) {
    console.error("Get stats error:", error);
    res.status(500).json({ success: false, message: "Internal server error" });
  }
};

// 📥 Export Reviews to CSV (NEW)
export const exportReviews = async (req, res) => {
  try {
    const { productId, rating, search } = req.query;

    const query = {};
    if (productId) query.product = productId;
    if (rating) query.rating = parseInt(rating);
    if (search) query.comment = { $regex: search, $options: 'i' };

    const reviews = await Review.find(query)
      .populate("user", "name email")
      .populate("product", "name")
      .sort({ createdAt: -1 });

    // Format data for CSV
    const csvData = reviews.map(r => ({
      'Review ID': r._id,
      'Product': r.product?.name || 'N/A',
      'User': r.user?.name || 'N/A',
      'Email': r.user?.email || 'N/A',
      'Rating': r.rating,
      'Comment': r.comment || 'No comment',
      'Images': r.images?.length || 0,
      'Date': new Date(r.createdAt).toLocaleDateString()
    }));

    // Convert to CSV
    const { Parser } = require('json2csv');
    const json2csvParser = new Parser();
    const csv = json2csvParser.parse(csvData);

    res.header('Content-Type', 'text/csv');
    res.header('Content-Disposition', `attachment; filename="reviews_${new Date().toISOString().split('T')[0]}.csv"`);
    res.send(csv);
  } catch (error) {
    console.error("Export error:", error);
    res.status(500).json({ success: false, message: "Internal server error" });
  }
};



// ======================================================
// ✔ Get All Sellers
// ======================================================
export const getAllSellers = async (req, res) => {
  try {
    const sellers = await Seller.find().sort({ createdAt: -1 });

    return res.status(200).json({
      success: true,
      sellers,
    });
  } catch (error) {
    console.error("Get All Sellers Error:", error);
    return res.status(500).json({
      success: false,
      message: "Failed to fetch sellers",
      error,
    });
  }
};



// ======================================================
// ✔ Get Single Seller
// ======================================================
export const getSingleSeller = async (req, res) => {
  try {
    const seller = await Seller.findById(req.params.id);

    if (!seller) {
      return res.status(404).json({
        success: false,
        message: "Seller not found",
      });
    }

    return res.status(200).json({
      success: true,
      seller,
    });
  } catch (error) {
    console.error("Get Single Seller Error:", error);
    return res.status(500).json({
      success: false,
      message: "Failed to fetch seller",
      error,
    });
  }
};

// -------------------------------------
// ✔ Add Seller
// -------------------------------------
export const addSeller = async (req, res) => {
  try {
    const seller = await Seller.create(req.body);
    return res.status(201).json({ message: "Seller created", seller });
  } catch (error) {
    console.error(error);
    return res.status(500).json({ message: "Failed to create seller" });
  }
};

// -------------------------------------
// ✔ Get All Sellers
// -------------------------------------
export const getSellers = async (req, res) => {
  try {
    const sellers = await Seller.find().sort({ createdAt: -1 });
    return res.status(200).json({ sellers });
  } catch (error) {
    console.error(error);
    return res.status(500).json({ message: "Failed to fetch sellers" });
  }
};

// -------------------------------------
// ✔ Get Single Seller
// -------------------------------------
export const getSellerById = async (req, res) => {
  try {
    const seller = await Seller.findById(req.params.id);

    if (!seller) {
      return res.status(404).json({ message: "Seller not found" });
    }

    return res.status(200).json({ seller });
  } catch (error) {
    console.error(error);
    return res.status(500).json({ message: "Failed to fetch seller" });
  }
};

// -------------------------------------
// ✔ Update Seller
// -------------------------------------
export const updateSeller = async (req, res) => {
  try {
    const seller = await Seller.findByIdAndUpdate(
      req.params.id,
      req.body,
      { new: true }
    );

    if (!seller) {
      return res.status(404).json({ message: "Seller not found" });
    }

    return res.status(200).json({ message: "Seller updated", seller });
  } catch (error) {
    console.error(error);
    return res.status(500).json({ message: "Failed to update seller" });
  }
};

// -------------------------------------
// ✔ Approve / Suspend Seller
// status = approved / suspended / pending
// -------------------------------------
export const updateSellerStatus = async (req, res) => {
  try {
    const { status } = req.body;

    if (!["approved", "suspended", "pending"].includes(status)) {
      return res.status(400).json({ message: "Invalid status" });
    }

    const seller = await Seller.findByIdAndUpdate(
      req.params.id,
      { status },
      { new: true }
    );

    if (!seller) {
      return res.status(404).json({ message: "Seller not found" });
    }

    return res.status(200).json({ message: "Status updated", seller });
  } catch (error) {
    console.error(error);
    return res.status(500).json({ message: "Failed to update seller status" });
  }
};



// ======================================================
// ✔ Delete Seller
// ======================================================
export const deleteSeller = async (req, res) => {
  try {
    const seller = await Seller.findByIdAndDelete(req.params.id);

    if (!seller) {
      return res.status(404).json({
        success: false,
        message: "Seller not found",
      });
    }

    // OPTIONAL: Unassign products from deleted seller
    await Product.updateMany(
      { seller: seller._id },
      { $set: { seller: null } }
    );

    return res.status(200).json({
      success: true,
      message: "Seller deleted successfully",
    });
  } catch (error) {
    console.error("Delete Seller Error:", error);
    return res.status(500).json({
      success: false,
      message: "Failed to delete seller",
      error,
    });
  }
};


// -------------------------------------
// ✔ Assign Products to Seller
// req.body.products = [productIds]
// -------------------------------------
export const assignProductsToSeller = async (req, res) => {
  try {
    const sellerId = req.params.id;
    const { products } = req.body;

    if (!Array.isArray(products) || products.length === 0) {
      return res.status(400).json({ message: "Products array required" });
    }

    // Assign seller to multiple products
    await Product.updateMany(
      { _id: { $in: products } },
      { $set: { seller: sellerId } }
    );

    return res.status(200).json({
      message: "Products assigned to seller successfully",
    });
  } catch (error) {
    console.error(error);
    return res.status(500).json({ message: "Failed to assign products" });
  }
};


// ==================== TAGS ====================
export const getAllTags = async (req, res) => {
  try {
    const tags = await Tag.find().sort({ createdAt: -1 });
    res.status(200).json({ success: true, data: tags });
  } catch (error) {
    console.error("Get tags error:", error);
    res.status(500).json({ success: false, message: "Internal server error" });
  }
};

export const addTag = async (req, res) => {
  try {
    const { name, description, color } = req.body;

    if (!name) {
      return res.status(400).json({ success: false, message: "Name is required" });
    }

    const existingTag = await Tag.findOne({ name });
    if (existingTag) {
      return res.status(400).json({ success: false, message: "Tag already exists" });
    }

    const tag = await Tag.create({ name, description, color });
    res.status(201).json({ success: true, message: "Tag added successfully", data: tag });
  } catch (error) {
    console.error("Add tag error:", error);
    res.status(500).json({ success: false, message: "Internal server error" });
  }
};

// 📌 Get Single Tag
export const getSingleTag = async (req, res) => {
  try {
    const { id } = req.params;

    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid tag ID'
      });
    }

    const tag = await Tag.findById(id);

    if (!tag) {
      return res.status(404).json({
        success: false,
        message: 'Tag not found'
      });
    }

    res.status(200).json({
      success: true,
      data: tag
    });
  } catch (error) {
    console.error('Get tag error:', error);
    res.status(500).json({ success: false, message: 'Internal server error' });
  }
};

// ➕ Create Tag
export const createTag = async (req, res) => {
  try {
    const admin = req.user;

    if (!admin || admin.role !== 'admin') {
      return res.status(403).json({
        success: false,
        message: 'Unauthorized. Admin access required.'
      });
    }

    const { name, slug, category, description, color } = req.body;

    if (!name) {
      return res.status(400).json({
        success: false,
        message: 'Tag name is required'
      });
    }

    // Check if tag already exists
    const existingTag = await Tag.findOne({
      $or: [
        { name: name.trim() },
        { slug: slug || name.toLowerCase().replace(/[^a-z0-9]+/g, '-') }
      ]
    });

    if (existingTag) {
      return res.status(400).json({
        success: false,
        message: 'Tag with this name or slug already exists'
      });
    }

    const tag = await Tag.create({
      name: name.trim(),
      slug: slug || undefined,
      category: category || 'General',
      description: description || '',
      color: color || '#06A096',
      createdBy: admin._id
    });

    res.status(201).json({
      success: true,
      message: 'Tag created successfully',
      data: tag
    });
  } catch (error) {
    console.error('Create tag error:', error);
    res.status(500).json({
      success: false,
      message: error.message || 'Internal server error'
    });
  }
};


export const updateTag = async (req, res) => {
  try {
    const { id } = req.params;
    const { name, description, color, isActive } = req.body;

    const tag = await Tag.findByIdAndUpdate(
      id,
      { name, description, color, isActive },
      { new: true, runValidators: true }
    );

    if (!tag) {
      return res.status(404).json({ success: false, message: "Tag not found" });
    }

    res.status(200).json({ success: true, message: "Tag updated successfully", data: tag });
  } catch (error) {
    console.error("Update tag error:", error);
    res.status(500).json({ success: false, message: "Internal server error" });
  }
};

export const deleteTag = async (req, res) => {
  try {
    const { id } = req.params;

    // Check if any products use this tag
    const productsCount = await Product.countDocuments({ tags: id });
    if (productsCount > 0) {
      return res.status(400).json({
        success: false,
        message: `Cannot delete. ${productsCount} product(s) use this tag`,
      });
    }

    const tag = await Tag.findByIdAndDelete(id);
    if (!tag) {
      return res.status(404).json({ success: false, message: "Tag not found" });
    }

    res.status(200).json({ success: true, message: "Tag deleted successfully" });
  } catch (error) {
    console.error("Delete tag error:", error);
    res.status(500).json({ success: false, message: "Internal server error" });
  }
};

// ==================== PRODUCT TYPES ====================
export const getAllProductTypes = async (req, res) => {
  try {
    const productTypes = await ProductType.find().sort({ createdAt: -1 });
    res.status(200).json({ success: true, data: productTypes });
  } catch (error) {
    console.error("Get product types error:", error);
    res.status(500).json({ success: false, message: "Internal server error" });
  }
};

export const addProductType = async (req, res) => {
  try {
    const { name, description, icon } = req.body;

    if (!name) {
      return res.status(400).json({ success: false, message: "Name is required" });
    }

    const existingType = await ProductType.findOne({ name });
    if (existingType) {
      return res.status(400).json({ success: false, message: "Product type already exists" });
    }

    const productType = await ProductType.create({ name, description, icon });
    res.status(201).json({
      success: true,
      message: "Product type added successfully",
      data: productType
    });
  } catch (error) {
    console.error("Add product type error:", error);
    res.status(500).json({ success: false, message: "Internal server error" });
  }
};

export const updateProductType = async (req, res) => {
  try {
    const { id } = req.params;
    const { name, description, icon, isActive } = req.body;

    const productType = await ProductType.findByIdAndUpdate(
      id,
      { name, description, icon, isActive },
      { new: true, runValidators: true }
    );

    if (!productType) {
      return res.status(404).json({ success: false, message: "Product type not found" });
    }

    res.status(200).json({
      success: true,
      message: "Product type updated successfully",
      data: productType
    });
  } catch (error) {
    console.error("Update product type error:", error);
    res.status(500).json({ success: false, message: "Internal server error" });
  }
};

export const deleteProductType = async (req, res) => {
  try {
    const { id } = req.params;

    // Check if any products use this type
    const productsCount = await Product.countDocuments({ productType: id });
    if (productsCount > 0) {
      return res.status(400).json({
        success: false,
        message: `Cannot delete. ${productsCount} product(s) use this type`,
      });
    }

    const productType = await ProductType.findByIdAndDelete(id);
    if (!productType) {
      return res.status(404).json({ success: false, message: "Product type not found" });
    }

    res.status(200).json({ success: true, message: "Product type deleted successfully" });
  } catch (error) {
    console.error("Delete product type error:", error);
    res.status(500).json({ success: false, message: "Internal server error" });
  }
};


// ==================== GET STOCK SUMMARY ====================
export const getStockSummary = async (req, res) => {
  try {
    const total = await Product.countDocuments();
    const inStock = await Product.countDocuments({ stock: { $gt: 10 } });
    const lowStock = await Product.countDocuments({ stock: { $gt: 0, $lte: 10 } });
    const outOfStock = await Product.countDocuments({ stock: 0 });

    res.json({
      success: true,
      data: { total, inStock, lowStock, outOfStock }
    });
  } catch (error) {
    console.error('Stock summary error:', error);
    res.status(500).json({
      success: false,
      message: error.message || 'Failed to get stock summary'
    });
  }
};

// ==================== GET STOCK PRODUCTS ====================
export const getStockProducts = async (req, res) => {
  try {
    let filter = {};

    // Stock filters
    if (req.query.stock === "low") filter.stock = { $gt: 0, $lte: 10 };
    if (req.query.stock === "out") filter.stock = 0;
    if (req.query.stock === "in") filter.stock = { $gt: 10 };

    // Category filter
    if (req.query.category && mongoose.Types.ObjectId.isValid(req.query.category)) {
      filter.category = req.query.category;
    }

    // Status filter
    if (req.query.status) {
      filter.isActive = req.query.status === 'active';
    }

    // Search filter
    if (req.query.search) {
      filter.$or = [
        { name: { $regex: req.query.search, $options: 'i' } },
        { brand: { $regex: req.query.search, $options: 'i' } },
      ];
    }

    const products = await Product.find(filter)
      .populate("category", "name")
      .sort({ createdAt: -1 });

    res.json({
      success: true,
      data: products,
      count: products.length
    });
  } catch (error) {
    console.error('Get stock products error:', error);
    res.status(500).json({
      success: false,
      message: error.message || 'Failed to get stock products'
    });
  }
};

export const updateStock = async (req, res) => {
  const { productId, quantity } = req.body;

  const product = await Product.findById(productId);
  product.quantity += quantity;

  await product.save();

  res.json({ success: true, message: "Stock updated successfully" });
};


// ==================== CREATE ORDER REQUEST ====================
export const createOrderRequest = async (req, res) => {
  try {
    const admin = req.user;

    if (!admin || admin.role !== "admin") {
      return res.status(403).json({
        success: false,
        message: "Unauthorized. Admin access required.",
      });
    }

    const {
      product,
      quantity,
      unit,
      orderType,
      priority,
      supplier,
      warehouse,
      currentStock,
      notes,
    } = req.body;

    // Validate required fields
    if (!product || !quantity || !unit || !orderType || !priority || !supplier || !warehouse) {
      return res.status(400).json({
        success: false,
        message: "All required fields must be provided",
      });
    }

    // Validate product exists
    if (!mongoose.Types.ObjectId.isValid(product)) {
      return res.status(400).json({
        success: false,
        message: "Invalid product ID",
      });
    }

    const productExists = await Product.findById(product);
    if (!productExists) {
      return res.status(404).json({
        success: false,
        message: "Product not found",
      });
    }

    // Create order request
    const orderRequest = await OrderRequest.create({
      product,
      quantity,
      unit,
      orderType,
      priority,
      supplier,
      warehouse,
      currentStock: currentStock || productExists.stock,
      requestedBy: admin._id,
      notes: notes || "",
      status: "pending",
    });

    await orderRequest.populate("product", "name images price");

    return res.status(201).json({
      success: true,
      message: "Order request created successfully",
      data: orderRequest,
    });
  } catch (error) {
    console.error("Create order request error:", error);
    return res.status(500).json({
      success: false,
      message: error.message || "Internal server error",
    });
  }
};

// ==================== GET ALL ORDER REQUESTS ====================
export const getAllOrderRequests = async (req, res) => {
  try {
    const { status, priority, orderType } = req.query;

    let filter = {};
    if (status) filter.status = status;
    if (priority) filter.priority = priority;
    if (orderType) filter.orderType = orderType;

    const orderRequests = await OrderRequest.find(filter)
      .populate("product", "name images price category")
      .populate("requestedBy", "name email")
      .sort({ createdAt: -1 });

    return res.status(200).json({
      success: true,
      data: orderRequests,
      count: orderRequests.length,
    });
  } catch (error) {
    console.error("Get order requests error:", error);
    return res.status(500).json({
      success: false,
      message: error.message || "Internal server error",
    });
  }
};

// ==================== UPDATE ORDER REQUEST STATUS ====================
export const updateOrderRequestStatus = async (req, res) => {
  try {
    const admin = req.user;

    if (!admin || admin.role !== "admin") {
      return res.status(403).json({
        success: false,
        message: "Unauthorized. Admin access required.",
      });
    }

    const { id } = req.params;
    const { status, notes } = req.body;

    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({
        success: false,
        message: "Invalid order request ID",
      });
    }

    const orderRequest = await OrderRequest.findById(id);
    if (!orderRequest) {
      return res.status(404).json({
        success: false,
        message: "Order request not found",
      });
    }

    if (status) orderRequest.status = status;
    if (notes) orderRequest.notes = notes;

    // If approved, update product stock
    if (status === "completed") {
      const product = await Product.findById(orderRequest.product);
      if (product) {
        product.stock += orderRequest.quantity;
        await product.save();
      }
    }

    await orderRequest.save();
    await orderRequest.populate("product", "name images price");

    return res.status(200).json({
      success: true,
      message: "Order request updated successfully",
      data: orderRequest,
    });
  } catch (error) {
    console.error("Update order request error:", error);
    return res.status(500).json({
      success: false,
      message: error.message || "Internal server error",
    });
  }
};



// ==================== GET ALL WAREHOUSES ====================
export const getAllWarehouses = async (req, res) => {
  try {
    const { isActive, city, search } = req.query;

    let filter = {};
    if (isActive !== undefined) filter.isActive = isActive === 'true';
    if (city) filter['location.city'] = { $regex: city, $options: 'i' };

    if (search) {
      filter.$or = [
        { name: { $regex: search, $options: 'i' } },
        { warehouseId: { $regex: search, $options: 'i' } },
        { 'location.city': { $regex: search, $options: 'i' } },
      ];
    }

    const warehouses = await Warehouse.find(filter)
      .populate('manager', 'name email')
      .sort({ createdAt: -1 });

    return res.status(200).json({
      success: true,
      data: warehouses,
      count: warehouses.length,
    });
  } catch (error) {
    console.error('Get warehouses error:', error);
    return res.status(500).json({
      success: false,
      message: error.message || 'Internal server error',
    });
  }
};

// ==================== GET SINGLE WAREHOUSE ====================
export const getSingleWarehouse = async (req, res) => {
  try {
    const { id } = req.params;

    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid warehouse ID',
      });
    }

    const warehouse = await Warehouse.findById(id).populate('manager', 'name email phone');

    if (!warehouse) {
      return res.status(404).json({
        success: false,
        message: 'Warehouse not found',
      });
    }

    return res.status(200).json({
      success: true,
      data: warehouse,
    });
  } catch (error) {
    console.error('Get warehouse error:', error);
    return res.status(500).json({
      success: false,
      message: error.message || 'Internal server error',
    });
  }
};

// ==================== CREATE WAREHOUSE ====================
export const createWarehouse = async (req, res) => {
  try {
    const admin = req.user;

    if (!admin || admin.role !== "admin") {
      return res.status(403).json({
        success: false,
        message: "Unauthorized. Admin access required.",
      });
    }

    const {
      warehouseId,
      name,
      location,
      capacity,
      currentUtilization,
      manager,
      contactNumber,
      operatingHours,
    } = req.body;

    // Validate required fields
    if (!warehouseId || !name || !capacity) {
      return res.status(400).json({
        success: false,
        message: 'Warehouse ID, name, and capacity are required',
      });
    }

    // Check if warehouse ID already exists
    const existingWarehouse = await Warehouse.findOne({ warehouseId });
    if (existingWarehouse) {
      return res.status(400).json({
        success: false,
        message: 'Warehouse with this ID already exists',
      });
    }

    const warehouse = await Warehouse.create({
      warehouseId: warehouseId.toUpperCase(),
      name,
      location,
      capacity,
      currentUtilization: currentUtilization || 0,
      manager,
      contactNumber,
      operatingHours,
      isActive: true,
    });

    await warehouse.populate('manager', 'name email');

    return res.status(201).json({
      success: true,
      message: 'Warehouse created successfully',
      data: warehouse,
    });
  } catch (error) {
    console.error('Create warehouse error:', error);
    return res.status(500).json({
      success: false,
      message: error.message || 'Internal server error',
    });
  }
};

// ==================== UPDATE WAREHOUSE ====================
export const updateWarehouse = async (req, res) => {
  try {
    const admin = req.user;

    if (!admin || admin.role !== "admin") {
      return res.status(403).json({
        success: false,
        message: "Unauthorized. Admin access required.",
      });
    }

    const { id } = req.params;

    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid warehouse ID',
      });
    }

    const warehouse = await Warehouse.findById(id);
    if (!warehouse) {
      return res.status(404).json({
        success: false,
        message: 'Warehouse not found',
      });
    }

    // Update fields
    const updateFields = [
      'warehouseId', 'name', 'location', 'capacity', 'currentUtilization',
      'manager', 'contactNumber', 'isActive', 'operatingHours'
    ];

    updateFields.forEach(field => {
      if (req.body[field] !== undefined) {
        warehouse[field] = req.body[field];
      }
    });

    await warehouse.save();
    await warehouse.populate('manager', 'name email');

    return res.status(200).json({
      success: true,
      message: 'Warehouse updated successfully',
      data: warehouse,
    });
  } catch (error) {
    console.error('Update warehouse error:', error);
    return res.status(500).json({
      success: false,
      message: error.message || 'Internal server error',
    });
  }
};

// ==================== DELETE WAREHOUSE ====================
export const deleteWarehouse = async (req, res) => {
  try {
    const admin = req.user;

    if (!admin || admin.role !== "admin") {
      return res.status(403).json({
        success: false,
        message: "Unauthorized. Admin access required.",
      });
    }

    const { id } = req.params;

    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid warehouse ID',
      });
    }

    const warehouse = await Warehouse.findByIdAndDelete(id);

    if (!warehouse) {
      return res.status(404).json({
        success: false,
        message: 'Warehouse not found',
      });
    }

    return res.status(200).json({
      success: true,
      message: 'Warehouse deleted successfully',
    });
  } catch (error) {
    console.error('Delete warehouse error:', error);
    return res.status(500).json({
      success: false,
      message: error.message || 'Internal server error',
    });
  }
};


// ==================== GET ALL SUPPLIERS ====================
export const getAllSuppliers = async (req, res) => {
  try {
    const { isActive, search } = req.query;

    let filter = {};
    if (isActive !== undefined) filter.isActive = isActive === 'true';

    if (search) {
      filter.$or = [
        { name: { $regex: search, $options: 'i' } },
        { email: { $regex: search, $options: 'i' } },
        { phone: { $regex: search, $options: 'i' } },
      ];
    }

    const suppliers = await Supplier.find(filter)
      .populate('products', 'name images price')
      .sort({ createdAt: -1 });

    return res.status(200).json({
      success: true,
      data: suppliers,
      count: suppliers.length,
    });
  } catch (error) {
    console.error('Get suppliers error:', error);
    return res.status(500).json({
      success: false,
      message: error.message || 'Internal server error',
    });
  }
};

// ==================== GET SINGLE SUPPLIER ====================
export const getSingleSupplier = async (req, res) => {
  try {
    const { id } = req.params;

    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid supplier ID format',
      });
    }

    const supplier = await Supplier.findById(id)
      .populate('products', 'name images price stock category');

    if (!supplier) {
      return res.status(404).json({
        success: false,
        message: 'Supplier not found',
      });
    }

    return res.status(200).json({
      success: true,
      data: supplier,
    });
  } catch (error) {
    console.error('Get supplier error:', error);
    return res.status(500).json({
      success: false,
      message: error.message || 'Internal server error',
    });
  }
};

// ==================== CREATE SUPPLIER ====================
export const createSupplier = async (req, res) => {
  try {
    const admin = req.user;

    if (!admin || admin.role !== "admin") {
      return res.status(403).json({
        success: false,
        message: "Unauthorized. Admin access required.",
      });
    }

    const {
      name,
      email,
      phone,
      address,
      contactPerson,
      products,
      rating,
      paymentTerms,
      deliveryTime,
      notes,
    } = req.body;

    // Validate required fields
    if (!name || !email || !phone) {
      return res.status(400).json({
        success: false,
        message: 'Name, email, and phone are required',
      });
    }

    // Email validation
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid email format',
      });
    }

    // Check if supplier already exists
    const existingSupplier = await Supplier.findOne({ email: email.toLowerCase() });
    if (existingSupplier) {
      return res.status(400).json({
        success: false,
        message: 'Supplier with this email already exists',
      });
    }

    // Create supplier
    const supplier = await Supplier.create({
      name: name.trim(),
      email: email.toLowerCase(),
      phone,
      address: address || {},
      contactPerson: contactPerson || {},
      products: products || [],
      rating: rating || 0,
      paymentTerms: paymentTerms || '',
      deliveryTime: deliveryTime || '',
      notes: notes || '',
      isActive: true,
    });

    await supplier.populate('products', 'name images price');

    return res.status(201).json({
      success: true,
      message: 'Supplier created successfully',
      data: supplier,
    });
  } catch (error) {
    console.error('Create supplier error:', error);
    return res.status(500).json({
      success: false,
      message: error.message || 'Internal server error',
    });
  }
};

// ==================== UPDATE SUPPLIER ====================
export const updateSupplier = async (req, res) => {
  try {
    const admin = req.user;

    if (!admin || admin.role !== "admin") {
      return res.status(403).json({
        success: false,
        message: "Unauthorized. Admin access required.",
      });
    }

    const { id } = req.params;

    // Validate ObjectId
    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid supplier ID format',
      });
    }

    // Find supplier
    const supplier = await Supplier.findById(id);
    if (!supplier) {
      return res.status(404).json({
        success: false,
        message: 'Supplier not found',
      });
    }

    // Check if email is being changed and if it's already taken
    if (req.body.email && req.body.email !== supplier.email) {
      const emailExists = await Supplier.findOne({
        email: req.body.email.toLowerCase(),
        _id: { $ne: id }
      });

      if (emailExists) {
        return res.status(400).json({
          success: false,
          message: 'Email already in use by another supplier',
        });
      }
    }

    // Update fields
    const updateFields = [
      'name', 'email', 'phone', 'address', 'contactPerson',
      'products', 'rating', 'isActive', 'paymentTerms', 'deliveryTime', 'notes'
    ];

    updateFields.forEach(field => {
      if (req.body[field] !== undefined) {
        if (field === 'name') {
          supplier[field] = req.body[field].trim();
        } else if (field === 'email') {
          supplier[field] = req.body[field].toLowerCase();
        } else {
          supplier[field] = req.body[field];
        }
      }
    });

    await supplier.save();
    await supplier.populate('products', 'name images price');

    return res.status(200).json({
      success: true,
      message: 'Supplier updated successfully',
      data: supplier,
    });
  } catch (error) {
    console.error('Update supplier error:', error);
    return res.status(500).json({
      success: false,
      message: error.message || 'Internal server error',
    });
  }
};

// ==================== DELETE SUPPLIER ====================
export const deleteSupplier = async (req, res) => {
  try {
    const admin = req.user;

    if (!admin || admin.role !== "admin") {
      return res.status(403).json({
        success: false,
        message: "Unauthorized. Admin access required.",
      });
    }

    const { id } = req.params;

    // Validate ObjectId
    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid supplier ID format',
      });
    }

    const supplier = await Supplier.findByIdAndDelete(id);

    if (!supplier) {
      return res.status(404).json({
        success: false,
        message: 'Supplier not found',
      });
    }

    return res.status(200).json({
      success: true,
      message: 'Supplier deleted successfully',
      data: {
        id: supplier._id,
        name: supplier.name,
      }
    });
  } catch (error) {
    console.error('Delete supplier error:', error);
    return res.status(500).json({
      success: false,
      message: error.message || 'Internal server error',
    });
  }
};
// ==================== INVENTORY CONTROLLER ====================

// ==================== GET INVENTORY OVERVIEW STATS ====================
export const getInventoryOverview = async (req, res) => {
  try {
    const admin = req.user;

    if (!admin || admin.role !== "admin") {
      return res.status(403).json({
        success: false,
        message: "Unauthorized. Admin access required.",
      });
    }

    // Total Products
    const totalProducts = await Product.countDocuments();

    // Stock Status
    const inStock = await Product.countDocuments({ stock: { $gt: 10 } });
    const lowStock = await Product.countDocuments({ stock: { $gt: 0, $lte: 10 } });
    const outOfStock = await Product.countDocuments({ stock: 0 });

    // Total Stock Value
    const stockValueResult = await Product.aggregate([
      {
        $group: {
          _id: null,
          totalValue: { $sum: { $multiply: ['$price', '$stock'] } },
          totalQuantity: { $sum: '$stock' }
        }
      }
    ]);
    const stockValue = stockValueResult[0] || { totalValue: 0, totalQuantity: 0 };

    // Active Warehouses
    const activeWarehouses = await Warehouse.countDocuments({ isActive: true });

    // Total Warehouse Capacity
    const warehouseStats = await Warehouse.aggregate([
      {
        $group: {
          _id: null,
          totalCapacity: { $sum: '$capacity' },
          totalUtilization: { $sum: '$currentUtilization' }
        }
      }
    ]);
    const warehouseData = warehouseStats[0] || { totalCapacity: 0, totalUtilization: 0 };
    const utilizationPercentage = warehouseData.totalCapacity > 0
      ? Math.round((warehouseData.totalUtilization / warehouseData.totalCapacity) * 100)
      : 0;

    // Active Suppliers
    const activeSuppliers = await Supplier.countDocuments({ isActive: true });

    // Pending Order Requests
    const pendingOrders = await OrderRequest.countDocuments({ status: 'pending' });

    // Recent Inventory Movements (Last 30 days)
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

    const recentMovements = await InventoryMovement.countDocuments({
      createdAt: { $gte: thirtyDaysAgo }
    });

    return res.status(200).json({
      success: true,
      data: {
        overview: {
          totalProducts,
          totalStockQuantity: stockValue.totalQuantity,
          totalStockValue: Math.round(stockValue.totalValue),
          activeWarehouses,
          activeSuppliers,
          pendingOrders,
          recentMovements
        },
        stockStatus: {
          inStock,
          lowStock,
          outOfStock,
          total: totalProducts
        },
        warehouseUtilization: {
          totalCapacity: warehouseData.totalCapacity,
          currentUtilization: warehouseData.totalUtilization,
          availableSpace: warehouseData.totalCapacity - warehouseData.totalUtilization,
          utilizationPercentage
        }
      }
    });
  } catch (error) {
    console.error('Get inventory overview error:', error);
    return res.status(500).json({
      success: false,
      message: error.message || 'Internal server error',
    });
  }
};

// ==================== GET LOW STOCK PRODUCTS ====================
export const getLowStockProducts = async (req, res) => {
  try {
    const { limit = 10 } = req.query;

    const lowStockProducts = await Product.find({
      stock: { $gt: 0, $lte: 10 }
    })
      .populate('category', 'name')
      .sort({ stock: 1 })
      .limit(parseInt(limit))
      .select('name images stock price category brand');

    return res.status(200).json({
      success: true,
      data: lowStockProducts,
      count: lowStockProducts.length
    });
  } catch (error) {
    console.error('Get low stock products error:', error);
    return res.status(500).json({
      success: false,
      message: error.message || 'Internal server error',
    });
  }
};

// ==================== GET OUT OF STOCK PRODUCTS ====================
export const getOutOfStockProducts = async (req, res) => {
  try {
    const { limit = 10 } = req.query;

    const outOfStockProducts = await Product.find({ stock: 0 })
      .populate('category', 'name')
      .sort({ updatedAt: -1 })
      .limit(parseInt(limit))
      .select('name images price category brand updatedAt');

    return res.status(200).json({
      success: true,
      data: outOfStockProducts,
      count: outOfStockProducts.length
    });
  } catch (error) {
    console.error('Get out of stock products error:', error);
    return res.status(500).json({
      success: false,
      message: error.message || 'Internal server error',
    });
  }
};

// ==================== GET TOP PRODUCTS BY STOCK VALUE ====================
export const getTopProductsByValue = async (req, res) => {
  try {
    const { limit = 10 } = req.query;

    const topProducts = await Product.aggregate([
      {
        $addFields: {
          stockValue: { $multiply: ['$price', '$stock'] }
        }
      },
      { $sort: { stockValue: -1 } },
      { $limit: parseInt(limit) },
      {
        $lookup: {
          from: 'categories',
          localField: 'category',
          foreignField: '_id',
          as: 'categoryInfo'
        }
      },
      {
        $project: {
          name: 1,
          images: 1,
          price: 1,
          stock: 1,
          stockValue: 1,
          brand: 1,
          category: { $arrayElemAt: ['$categoryInfo.name', 0] }
        }
      }
    ]);

    return res.status(200).json({
      success: true,
      data: topProducts,
      count: topProducts.length
    });
  } catch (error) {
    console.error('Get top products error:', error);
    return res.status(500).json({
      success: false,
      message: error.message || 'Internal server error',
    });
  }
};

// ==================== GET INVENTORY MOVEMENTS ====================
export const getInventoryMovements = async (req, res) => {
  try {
    const {
      limit = 20,
      movementType,
      warehouseId,
      productId,
      startDate,
      endDate
    } = req.query;

    let filter = {};

    if (movementType) filter.movementType = movementType;
    if (warehouseId && mongoose.Types.ObjectId.isValid(warehouseId)) {
      filter.warehouse = warehouseId;
    }
    if (productId && mongoose.Types.ObjectId.isValid(productId)) {
      filter.product = productId;
    }
    if (startDate || endDate) {
      filter.createdAt = {};
      if (startDate) filter.createdAt.$gte = new Date(startDate);
      if (endDate) filter.createdAt.$lte = new Date(endDate);
    }

    const movements = await InventoryMovement.find(filter)
      .populate('product', 'name images')
      .populate('warehouse', 'name warehouseId')
      .populate('performedBy', 'name email')
      .sort({ createdAt: -1 })
      .limit(parseInt(limit));

    return res.status(200).json({
      success: true,
      data: movements,
      count: movements.length
    });
  } catch (error) {
    console.error('Get inventory movements error:', error);
    return res.status(500).json({
      success: false,
      message: error.message || 'Internal server error',
    });
  }
};

// ==================== CREATE INVENTORY MOVEMENT ====================
export const createInventoryMovement = async (req, res) => {
  try {
    const admin = req.user;

    if (!admin || admin.role !== "admin") {
      return res.status(403).json({
        success: false,
        message: "Unauthorized. Admin access required.",
      });
    }

    const {
      productId,
      warehouseId,
      movementType,
      quantity,
      reason,
      notes,
      cost
    } = req.body;

    // Validate required fields
    if (!productId || !warehouseId || !movementType || !quantity || !reason) {
      return res.status(400).json({
        success: false,
        message: 'All required fields must be provided',
      });
    }

    // Get product
    const product = await Product.findById(productId);
    if (!product) {
      return res.status(404).json({
        success: false,
        message: 'Product not found',
      });
    }

    const previousStock = product.stock;
    let newStock = previousStock;

    // Calculate new stock based on movement type
    if (movementType === 'in') {
      newStock = previousStock + parseInt(quantity);
    } else if (movementType === 'out' || movementType === 'damage') {
      newStock = previousStock - parseInt(quantity);
      if (newStock < 0) newStock = 0;
    } else if (movementType === 'adjustment') {
      newStock = parseInt(quantity);
    }

    // Create movement record
    const movement = await InventoryMovement.create({
      product: productId,
      warehouse: warehouseId,
      movementType,
      quantity: parseInt(quantity),
      previousStock,
      newStock,
      reason,
      notes: notes || '',
      cost: cost || 0,
      performedBy: admin._id,
      referenceType: 'manual'
    });

    // Update product stock
    product.stock = newStock;
    await product.save();

    await movement.populate('product', 'name images');
    await movement.populate('warehouse', 'name warehouseId');
    await movement.populate('performedBy', 'name email');

    return res.status(201).json({
      success: true,
      message: 'Inventory movement recorded successfully',
      data: movement
    });
  } catch (error) {
    console.error('Create inventory movement error:', error);
    return res.status(500).json({
      success: false,
      message: error.message || 'Internal server error',
    });
  }
};

// ==================== GET STOCK TRENDS (Last 7 days) ====================
export const getStockTrends = async (req, res) => {
  try {
    const sevenDaysAgo = new Date();
    sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);

    const trends = await InventoryMovement.aggregate([
      {
        $match: {
          createdAt: { $gte: sevenDaysAgo }
        }
      },
      {
        $group: {
          _id: {
            date: { $dateToString: { format: '%Y-%m-%d', date: '$createdAt' } },
            type: '$movementType'
          },
          totalQuantity: { $sum: '$quantity' },
          count: { $sum: 1 }
        }
      },
      {
        $sort: { '_id.date': 1 }
      }
    ]);

    return res.status(200).json({
      success: true,
      data: trends
    });
  } catch (error) {
    console.error('Get stock trends error:', error);
    return res.status(500).json({
      success: false,
      message: error.message || 'Internal server error',
    });
  }
};

// ==================== GET CATEGORY WISE STOCK ====================
export const getCategoryWiseStock = async (req, res) => {
  try {
    const categoryStock = await Product.aggregate([
      {
        $lookup: {
          from: 'categories',
          localField: 'category',
          foreignField: '_id',
          as: 'categoryInfo'
        }
      },
      {
        $unwind: '$categoryInfo'
      },
      {
        $group: {
          _id: '$category',
          categoryName: { $first: '$categoryInfo.name' },
          totalProducts: { $sum: 1 },
          totalStock: { $sum: '$stock' },
          totalValue: { $sum: { $multiply: ['$price', '$stock'] } },
          lowStockCount: {
            $sum: {
              $cond: [{ $and: [{ $gt: ['$stock', 0] }, { $lte: ['$stock', 10] }] }, 1, 0]
            }
          },
          outOfStockCount: {
            $sum: { $cond: [{ $eq: ['$stock', 0] }, 1, 0] }
          }
        }
      },
      {
        $sort: { totalValue: -1 }
      }
    ]);

    return res.status(200).json({
      success: true,
      data: categoryStock,
      count: categoryStock.length
    });
  } catch (error) {
    console.error('Get category wise stock error:', error);
    return res.status(500).json({
      success: false,
      message: error.message || 'Internal server error',
    });
  }
};

// 📊 Get Sales Stats
export const getSalesStats = async (req, res) => {
  try {
    // Get completed orders only
    const completedOrders = await Order.find({
      orderStatus: 'Delivered'
    });

    const totalSales = completedOrders.reduce((sum, order) => sum + order.totalAmount, 0);
    const totalOrders = completedOrders.length;
    const averageOrder = totalOrders > 0 ? totalSales / totalOrders : 0;

    const refunded = await Order.countDocuments({ orderStatus: 'Returned' });

    res.status(200).json({
      success: true,
      data: {
        totalSales: Math.round(totalSales),
        totalOrders,
        averageOrder: Math.round(averageOrder * 100) / 100,
        refunded
      }
    });
  } catch (error) {
    console.error('Get sales stats error:', error);
    res.status(500).json({ success: false, message: 'Internal server error' });
  }
};

// 📈 Get Revenue Chart Data
export const getRevenueChart = async (req, res) => {
  try {
    const startDate = new Date();
    startDate.setMonth(startDate.getMonth() - 12);

    const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

    const revenueData = await Order.aggregate([
      {
        $match: {
          createdAt: { $gte: startDate },
          orderStatus: { $in: ['Delivered', 'Returned'] }
        }
      },
      {
        $group: {
          _id: {
            $dateToString: { format: '%Y-%m', date: '$createdAt' }
          },
          earning: {
            $sum: {
              $cond: [
                { $eq: ['$orderStatus', 'Delivered'] },
                '$totalAmount',
                0
              ]
            }
          },
          refunds: {
            $sum: {
              $cond: [
                { $eq: ['$orderStatus', 'Returned'] },
                '$totalAmount',
                0
              ]
            }
          }
        }
      },
      {
        $sort: { _id: 1 }
      }
    ]);

    const dataMap = {};
    revenueData.forEach(item => {
      dataMap[item._id] = {
        earning: Math.round(item.earning),
        refunds: Math.round(item.refunds)
      };
    });

    const chartData = [];
    for (let i = 11; i >= 0; i--) {
      const date = new Date();
      date.setMonth(date.getMonth() - i);
      const key = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
      const month = months[date.getMonth()];

      chartData.push({
        month,
        earning: dataMap[key]?.earning || 0,
        refunds: dataMap[key]?.refunds || 0
      });
    }

    res.status(200).json({
      success: true,
      data: chartData
    });
  } catch (error) {
    console.error('Get revenue chart error:', error);
    res.status(500).json({ success: false, message: 'Internal server error' });
  }
};

// 🌍 Get Top Countries By Sales
export const getTopCountries = async (req, res) => {
  try {
    const topCountries = await Order.aggregate([
      {
        $match: {
          orderStatus: 'Delivered'
        }
      },
      {
        $group: {
          _id: '$shippingAddress.country',
          sales: { $sum: '$totalAmount' },
          count: { $sum: 1 }
        }
      },
      {
        $sort: { sales: -1 }
      },
      {
        $limit: 6
      }
    ]);

    // Map country codes to flags and format data
    const countryFlags = {
      'Canada': 'https://flagcdn.com/w40/ca.png',
      'Korea': 'https://flagcdn.com/w40/kr.png',
      'France': 'https://flagcdn.com/w40/fr.png',
      'Germany': 'https://flagcdn.com/w40/de.png',
      'India': 'https://flagcdn.com/w40/in.png',
      'USA': 'https://flagcdn.com/w40/us.png'
    };

    const formattedData = topCountries.map((country, index) => ({
      name: country._id || 'Unknown',
      flag: countryFlags[country._id] || 'https://flagcdn.com/w40/un.png',
      sales: `${Math.round(country.sales / 1000)}k`,
      trend: generateTrendPoints(index),
      isPositive: index % 2 === 0 // Alternate between positive/negative trends
    }));

    res.status(200).json({
      success: true,
      data: formattedData
    });
  } catch (error) {
    console.error('Get top countries error:', error);
    res.status(500).json({ success: false, message: 'Internal server error' });
  }
};

// Generate trend sparkline points
function generateTrendPoints(seed) {
  const points = [];
  for (let i = 0; i < 10; i++) {
    const y = 10 + Math.sin((i + seed) * 0.5) * 5 + Math.random() * 3;
    points.push(`${i * 5},${y}`);
  }
  return points.join(' ');
}

// 📋 Get Sales Reports
export const getSalesReports = async (req, res) => {
  try {
    const { search, status, date, page = 1, limit = 6 } = req.query;
    const query = { orderStatus: 'Delivered' };

    // Search filter
    if (search) {
      const products = await Product.find({
        name: { $regex: search, $options: 'i' }
      }).select('_id');

      query['orderItems.product'] = { $in: products.map(p => p._id) };
    }

    // Date filter
    if (date) {
      const now = new Date();
      let startDate;

      switch (date) {
        case 'today':
          startDate = new Date(now.setHours(0, 0, 0, 0));
          break;
        case 'week':
          startDate = new Date(now.setDate(now.getDate() - 7));
          break;
        case 'month':
          startDate = new Date(now.setMonth(now.getMonth() - 1));
          break;
        case 'year':
          startDate = new Date(now.setFullYear(now.getFullYear() - 1));
          break;
      }

      if (startDate) {
        query.createdAt = { $gte: startDate };
      }
    }

    const orders = await Order.find(query)
      .populate('orderItems.product', 'name category')
      .sort({ createdAt: -1 })
      .limit(limit * 1)
      .skip((page - 1) * limit);

    const total = await Order.countDocuments(query);

    // Format reports
    const reports = orders.map(order => {
      const firstProduct = order.orderItems[0]?.product;
      return {
        _id: order._id,
        reportId: order.orderNumber || order._id.slice(-6),
        productName: firstProduct?.name || 'Multiple Products',
        category: firstProduct?.category?.name || 'Fashion',
        earning: Math.round(order.totalAmount),
        status: status || 'Published',
        date: order.createdAt
      };
    });

    res.status(200).json({
      success: true,
      data: reports,
      pagination: {
        total,
        page: Number(page),
        pages: Math.ceil(total / limit)
      }
    });
  } catch (error) {
    console.error('Get sales reports error:', error);
    res.status(500).json({ success: false, message: 'Internal server error' });
  }
};

// 📥 Export Sales Reports
export const exportSalesReports = async (req, res) => {
  try {
    const { ids } = req.query;

    let query = { orderStatus: 'Delivered' };
    if (ids) {
      query._id = { $in: ids.split(',') };
    }

    const orders = await Order.find(query)
      .populate('orderItems.product', 'name category')
      .populate('user', 'name email phone')
      .sort({ createdAt: -1 });

    // Create CSV
    const csvHeader = 'ID,Product,Category,Customer,Email,Phone,Amount,Date\n';
    const csvRows = orders.map(order => {
      const product = order.orderItems[0]?.product;
      return [
        order.orderNumber || order._id.slice(-6),
        product?.name || 'Multiple',
        product?.category?.name || 'N/A',
        order.user?.name || 'N/A',
        order.user?.email || 'N/A',
        order.user?.phone || 'N/A',
        order.totalAmount,
        new Date(order.createdAt).toLocaleDateString()
      ].join(',');
    }).join('\n');

    const csv = csvHeader + csvRows;

    res.setHeader('Content-Type', 'text/csv');
    res.setHeader('Content-Disposition', 'attachment; filename=sales-report.csv');
    res.status(200).send(csv);
  } catch (error) {
    console.error('Export sales reports error:', error);
    res.status(500).json({ success: false, message: 'Internal server error' });
  }
};


// // 📋 Get All Tags
// export const getAllTags = async (req, res) => {
//   try {
//     const { search, category, date, page = 1, limit = 10 } = req.query;
//     const query = {};

//     // Search filter
//     if (search) {
//       query.$or = [
//         { name: { $regex: search, $options: 'i' } },
//         { slug: { $regex: search, $options: 'i' } }
//       ];
//     }

//     // Category filter
//     if (category) {
//       query.category = category;
//     }

//     // Date filter
//     if (date) {
//       const now = new Date();
//       let startDate;

//       switch (date) {
//         case 'today':
//           startDate = new Date(now.setHours(0, 0, 0, 0));
//           break;
//         case 'week':
//           startDate = new Date(now.setDate(now.getDate() - 7));
//           break;
//         case 'month':
//           startDate = new Date(now.setMonth(now.getMonth() - 1));
//           break;
//       }

//       if (startDate) {
//         query.createdAt = { $gte: startDate };
//       }
//     }

//     const tags = await Tag.find(query)
//       .sort({ createdAt: -1 })
//       .limit(limit * 1)
//       .skip((page - 1) * limit);

//     const total = await Tag.countDocuments(query);

//     res.status(200).json({
//       success: true,
//       data: tags,
//       pagination: {
//         total,
//         page: Number(page),
//         pages: Math.ceil(total / limit)
//       }
//     });
//   } catch (error) {
//     console.error('Get tags error:', error);
//     res.status(500).json({ success: false, message: 'Internal server error' });
//   }
// };

// // ✏️ Update Tag
// export const updateTag = async (req, res) => {
//   try {
//     const admin = req.user;

//     if (!admin || admin.role !== 'admin') {
//       return res.status(403).json({
//         success: false,
//         message: 'Unauthorized. Admin access required.'
//       });
//     }

//     const { id } = req.params;

//     if (!mongoose.Types.ObjectId.isValid(id)) {
//       return res.status(400).json({
//         success: false,
//         message: 'Invalid tag ID'
//       });
//     }

//     const tag = await Tag.findById(id);

//     if (!tag) {
//       return res.status(404).json({
//         success: false,
//         message: 'Tag not found'
//       });
//     }

//     const { name, slug, category, description, color } = req.body;

//     // Check for duplicate name/slug (excluding current tag)
//     if (name || slug) {
//       const duplicateTag = await Tag.findOne({
//         _id: { $ne: id },
//         $or: [
//           { name: name || tag.name },
//           { slug: slug || tag.slug }
//         ]
//       });

//       if (duplicateTag) {
//         return res.status(400).json({
//           success: false,
//           message: 'Tag with this name or slug already exists'
//         });
//       }
//     }

//     // Update fields
//     if (name) tag.name = name.trim();
//     if (slug) tag.slug = slug;
//     if (category) tag.category = category;
//     if (description !== undefined) tag.description = description;
//     if (color) tag.color = color;

//     await tag.save();

//     res.status(200).json({
//       success: true,
//       message: 'Tag updated successfully',
//       data: tag
//     });
//   } catch (error) {
//     console.error('Update tag error:', error);
//     res.status(500).json({ 
//       success: false, 
//       message: error.message || 'Internal server error' 
//     });
//   }
// };

// // 🗑️ Delete Tag
// export const deleteTag = async (req, res) => {
//   try {
//     const admin = req.user;

//     if (!admin || admin.role !== 'admin') {
//       return res.status(403).json({
//         success: false,
//         message: 'Unauthorized. Admin access required.'
//       });
//     }

//     const { id } = req.params;

//     if (!mongoose.Types.ObjectId.isValid(id)) {
//       return res.status(400).json({
//         success: false,
//         message: 'Invalid tag ID'
//       });
//     }

//     const tag = await Tag.findByIdAndDelete(id);

//     if (!tag) {
//       return res.status(404).json({
//         success: false,
//         message: 'Tag not found'
//       });
//     }

//     res.status(200).json({
//       success: true,
//       message: 'Tag deleted successfully'
//     });
//   } catch (error) {
//     console.error('Delete tag error:', error);
//     res.status(500).json({ 
//       success: false, 
//       message: 'Internal server error' 
//     });
//   }
// };


// 📋 Get All Transactions with Filters
export const getTransactions = async (req, res) => {
  try {
    const {
      search,
      paymentStatus,
      receivedStatus,
      dateFilter,
      page = 1,
      limit = 10
    } = req.query;

    // Build query
    let query = {};

    // Search filter
    if (search) {
      query.$or = [
        { trackingNumber: { $regex: search, $options: 'i' } },
        { email: { $regex: search, $options: 'i' } },
      ];
    }

    // Payment status filter
    if (paymentStatus) {
      query.paymentStatus = paymentStatus;
    }

    // Received status filter
    if (receivedStatus) {
      query.status = receivedStatus;
    }

    // Date filter
    if (dateFilter) {
      const now = new Date();
      let startDate;

      switch (dateFilter) {
        case 'today':
          startDate = new Date(now.setHours(0, 0, 0, 0));
          break;
        case 'week':
          startDate = new Date(now.setDate(now.getDate() - 7));
          break;
        case 'month':
          startDate = new Date(now.setMonth(now.getMonth() - 1));
          break;
        case 'year':
          startDate = new Date(now.setFullYear(now.getFullYear() - 1));
          break;
      }

      if (startDate) {
        query.date = { $gte: startDate };
      }
    }

    // Pagination
    const skip = (page - 1) * limit;
    const total = await Transaction.countDocuments(query);
    const pages = Math.ceil(total / limit);

    // Fetch transactions
    const transactions = await Transaction.find(query)
      .populate('orderId', 'orderNumber')
      .sort({ date: -1 })
      .skip(skip)
      .limit(parseInt(limit));

    res.status(200).json({
      success: true,
      data: transactions,
      pagination: {
        page: parseInt(page),
        limit: parseInt(limit),
        total,
        pages,
      },
    });
  } catch (error) {
    console.error('Get transactions error:', error);
    res.status(500).json({ success: false, message: 'Internal server error' });
  }
};

// 📥 Export Transactions to CSV
export const exportTransactions = async (req, res) => {
  try {
    const { search, paymentStatus, receivedStatus, dateFilter } = req.query;

    // Build same query as getTransactions
    let query = {};

    if (search) {
      query.$or = [
        { trackingNumber: { $regex: search, $options: 'i' } },
        { email: { $regex: search, $options: 'i' } },
      ];
    }

    if (paymentStatus) {
      query.paymentStatus = paymentStatus;
    }

    if (receivedStatus) {
      query.status = receivedStatus;
    }

    if (dateFilter) {
      const now = new Date();
      let startDate;

      switch (dateFilter) {
        case 'today':
          startDate = new Date(now.setHours(0, 0, 0, 0));
          break;
        case 'week':
          startDate = new Date(now.setDate(now.getDate() - 7));
          break;
        case 'month':
          startDate = new Date(now.setMonth(now.getMonth() - 1));
          break;
        case 'year':
          startDate = new Date(now.setFullYear(now.getFullYear() - 1));
          break;
      }

      if (startDate) {
        query.date = { $gte: startDate };
      }
    }

    // Fetch all transactions without pagination
    const transactions = await Transaction.find(query)
      .populate('orderId', 'orderNumber')
      .sort({ date: -1 });

    // Format data for CSV
    const csvData = transactions.map(t => ({
      'Tracking Number': t.trackingNumber,
      'Product Price': `$${t.productPrice.toFixed(2)}`,
      'Delivery Fee': `$${t.deliveryFee.toFixed(2)}`,
      'Payment Method': t.paymentMethod,
      'Email': t.email,
      'Payment Status': t.paymentStatus,
      'Status': t.status,
      'Date': new Date(t.date).toLocaleDateString('en-US', {
        day: 'numeric',
        month: 'short',
        year: 'numeric'
      }),
    }));

    // Convert to CSV
    const json2csvParser = new Parser();
    const csv = json2csvParser.parse(csvData);

    // Set headers and send file
    res.header('Content-Type', 'text/csv');
    res.header('Content-Disposition', `attachment; filename="transactions_${new Date().toISOString().split('T')[0]}.csv"`);
    res.send(csv);
  } catch (error) {
    console.error('Export transactions error:', error);
    res.status(500).json({ success: false, message: 'Internal server error' });
  }
};

// 📝 Create Transaction (automatically when order is placed)
// transactionController.js

export const createTransaction = async (orderData) => {
  try {
    // First populate user to get email
    const populatedOrder = await Order.findById(orderData._id).populate('user', 'email name');

    if (!populatedOrder) {
      throw new Error('Order not found for transaction');
    }

    // Calculate delivery fee from order (shipping cost)
    const subtotal = populatedOrder.orderItems.reduce((sum, item) => {
      return sum + (item.price * item.quantity);
    }, 0);

    const deliveryFee = populatedOrder.totalAmount - subtotal; // This gives us shipping cost

    const transaction = await Transaction.create({
      orderId: populatedOrder._id,
      userId: populatedOrder.user._id,
      trackingNumber: populatedOrder.orderNumber,
      productPrice: subtotal,
      totalAmount: populatedOrder.totalAmount, // Only product price (without shipping)
      deliveryFee: deliveryFee, // Shipping cost
      paymentMethod: populatedOrder.paymentMethod || 'COD',
      email: populatedOrder.user.email, // Now this will work
      paymentStatus: populatedOrder.paymentStatus.toLowerCase(), // Convert 'Pending' to 'pending'
      status: populatedOrder.orderStatus, // 'Processing', 'Shipped', etc.
      date: populatedOrder.createdAt,
    });

    // console.log('✅ Transaction created:', transaction._id);
    return transaction;
  } catch (error) {
    console.error('❌ Create transaction error:', error);
    // Don't throw error - just log it so order creation doesn't fail
    return null;
  }
};




// ============================================
// 📁 controllers/financeController.js
// ============================================

// 📊 Get Finance Statistics (Using Orders & Transactions)
export const getFinanceStats = async (req, res) => {
  try {
    const now = new Date();
    const lastMonth = new Date(now.getFullYear(), now.getMonth() - 1, 1);
    const thisMonth = new Date(now.getFullYear(), now.getMonth(), 1);

    // ✅ Current Month Orders
    const currentOrders = await Order.find({
      createdAt: { $gte: thisMonth },
      paymentStatus: { $in: ['Paid', 'Refunded'] }
    });

    // ✅ Last Month Orders
    const lastMonthOrders = await Order.find({
      createdAt: { $gte: lastMonth, $lt: thisMonth },
      paymentStatus: { $in: ['Paid', 'Refunded'] }
    });

    // Calculate Income (Total Amount from Paid orders)
    const totalIncome = currentOrders
      .filter(o => o.paymentStatus === 'Paid')
      .reduce((sum, o) => sum + o.totalAmount, 0);

    const lastIncome = lastMonthOrders
      .filter(o => o.paymentStatus === 'Paid')
      .reduce((sum, o) => sum + o.totalAmount, 0);

    // Calculate Expenses (Shipping + Tax + Refunds)
    const totalExpenses = currentOrders.reduce((sum, o) => {
      return sum + (o.shippingCost || 0) + (o.tax || 0);
    }, 0);

    // Add refund amounts to expenses
    const refundAmount = currentOrders
      .filter(o => o.paymentStatus === 'Refunded')
      .reduce((sum, o) => sum + (o.refundAmount || o.totalAmount), 0);

    const totalExpensesWithRefunds = totalExpenses + refundAmount;

    const lastExpenses = lastMonthOrders.reduce((sum, o) => {
      return sum + (o.shippingCost || 0) + (o.tax || 0);
    }, 0) + lastMonthOrders
      .filter(o => o.paymentStatus === 'Refunded')
      .reduce((sum, o) => sum + (o.refundAmount || o.totalAmount), 0);

    // Calculate Revenue (Income - Expenses)
    const totalRevenue = totalIncome - totalExpensesWithRefunds;
    const lastRevenue = lastIncome - lastExpenses;

    // Calculate Average Earning per order
    const paidOrders = currentOrders.filter(o => o.paymentStatus === 'Paid');
    const averageEarning = paidOrders.length > 0
      ? totalIncome / paidOrders.length
      : 0;

    const lastPaidOrders = lastMonthOrders.filter(o => o.paymentStatus === 'Paid');
    const lastAverage = lastPaidOrders.length > 0
      ? lastIncome / lastPaidOrders.length
      : 0;

    // Calculate percentage changes
    const calculateChange = (current, last) => {
      if (last === 0) return current > 0 ? 100 : 0;
      return Number(((current - last) / last * 100).toFixed(1));
    };

    res.status(200).json({
      success: true,
      data: {
        totalIncome: Math.round(totalIncome),
        totalExpenses: Math.round(totalExpensesWithRefunds),
        totalRevenue: Math.round(totalRevenue),
        averageEarning: Math.round(averageEarning),
        incomeChange: calculateChange(totalIncome, lastIncome),
        expensesChange: calculateChange(totalExpensesWithRefunds, lastExpenses),
        revenueChange: calculateChange(totalRevenue, lastRevenue),
        earningChange: calculateChange(averageEarning, lastAverage),
      }
    });
  } catch (error) {
    console.error('Get finance stats error:', error);
    res.status(500).json({ success: false, message: 'Internal server error' });
  }
};

// 📈 Get Chart Data (Using Orders)
export const getFinanceChart = async (req, res) => {
  try {
    const { period = '12months' } = req.query;

    let startDate, groupBy;
    const now = new Date();

    switch (period) {
      case '24hours':
        startDate = new Date(now.getTime() - 24 * 60 * 60 * 1000);
        groupBy = { $hour: '$createdAt' };
        break;
      case '7days':
        startDate = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
        groupBy = { $dayOfWeek: '$createdAt' };
        break;
      case '30days':
        startDate = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
        groupBy = { $dayOfMonth: '$createdAt' };
        break;
      case '12months':
      default:
        startDate = new Date(now.getFullYear() - 1, now.getMonth(), 1);
        groupBy = { $month: '$createdAt' };
        break;
    }

    // ✅ Aggregate earnings (paid orders) and expenses
    const data = await Order.aggregate([
      {
        $match: {
          createdAt: { $gte: startDate },
          paymentStatus: { $in: ['Paid', 'Refunded'] }
        }
      },
      {
        $group: {
          _id: groupBy,
          earning: {
            $sum: {
              $cond: [
                { $eq: ['$paymentStatus', 'Paid'] },
                '$totalAmount',
                0
              ]
            }
          },
          expenses: {
            $sum: {
              $add: [
                { $ifNull: ['$shippingCost', 0] },
                { $ifNull: ['$tax', 0] },
                {
                  $cond: [
                    { $eq: ['$paymentStatus', 'Refunded'] },
                    { $ifNull: ['$refundAmount', '$totalAmount'] },
                    0
                  ]
                }
              ]
            }
          }
        }
      },
      { $sort: { _id: 1 } }
    ]);

    // Format data based on period
    const monthNames = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
    const dayNames = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

    const formatted = data.map(item => {
      let name;
      if (period === '12months') {
        name = monthNames[item._id - 1];
      } else if (period === '7days') {
        name = dayNames[item._id - 1];
      } else {
        name = item._id.toString();
      }

      return {
        name,
        earning: Math.round(item.earning / 1000), // Convert to thousands
        expenses: Math.round(item.expenses / 1000),
      };
    });

    res.status(200).json({
      success: true,
      data: formatted
    });
  } catch (error) {
    console.error('Get finance chart error:', error);
    res.status(500).json({ success: false, message: 'Internal server error' });
  }
};

// 💰 Get Transactions (Using Transaction Model)
export const getFinanceTransactions = async (req, res) => {
  try {
    const {
      search,
      paymentMethod,
      status,
      dateFilter,
      page = 1,
      limit = 20
    } = req.query;

    const query = {};

    // Search
    if (search) {
      query.$or = [
        { trackingNumber: { $regex: search, $options: 'i' } },
        { email: { $regex: search, $options: 'i' } }
      ];
    }

    // Payment Method Filter
    if (paymentMethod) {
      query.paymentMethod = paymentMethod;
    }

    // Status Filter
    if (status) {
      // Map frontend status to backend
      const statusMap = {
        'received': 'paid',
        'pending': 'pending',
        'failed': 'failed',
        'completed': 'paid'
      };
      query.paymentStatus = statusMap[status] || status;
    }

    // Date filter
    if (dateFilter) {
      const now = new Date();
      let startDate;

      switch (dateFilter) {
        case 'today':
          startDate = new Date(now.setHours(0, 0, 0, 0));
          break;
        case 'week':
          startDate = new Date(now.setDate(now.getDate() - 7));
          break;
        case 'month':
          startDate = new Date(now.setMonth(now.getMonth() - 1));
          break;
        case 'year':
          startDate = new Date(now.setFullYear(now.getFullYear() - 1));
          break;
      }

      if (startDate) {
        query.createdAt = { $gte: startDate };
      }
    }

    const transactions = await Transaction.find(query)
      .populate('userId', 'name email')
      .populate('orderId', 'orderNumber orderStatus')
      .sort({ createdAt: -1 })
      .limit(limit * 1)
      .skip((page - 1) * limit);

    const total = await Transaction.countDocuments(query);

    // ✅ Format for frontend
    const formatted = transactions.map(t => ({
      _id: t._id,
      transactionId: t.trackingNumber,
      amount: t.totalAmount,
      paymentMethod: t.paymentMethod,
      status: t.paymentStatus === 'paid' ? 'received' : t.paymentStatus,
      email: t.email,
      user: t.userId,
      order: t.orderId,
      createdAt: t.createdAt
    }));

    res.status(200).json({
      success: true,
      data: formatted,
      pagination: {
        total,
        page: Number(page),
        pages: Math.ceil(total / limit),
      }
    });
  } catch (error) {
    console.error('Get transactions error:', error);
    res.status(500).json({ success: false, message: 'Internal server error' });
  }
};

// 📥 Export Finance Data
export const exportFinanceData = async (req, res) => {
  try {
    // ✅ Get all transactions
    const transactions = await Transaction.find()
      .populate('userId', 'name email')
      .populate('orderId', 'orderNumber')
      .sort({ createdAt: -1 });

    const csvData = transactions.map(t => ({
      'Transaction ID': t.trackingNumber,
      'Order Number': t.orderId?.orderNumber || 'N/A',
      'Amount': `$${t.totalAmount?.toFixed(2)}`,
      'Product Price': `$${t.productPrice?.toFixed(2)}`,
      'Delivery Fee': `$${t.deliveryFee?.toFixed(2)}`,
      'Tax': `$${t.tax?.toFixed(2)}`,
      'Discount': `$${t.discount?.toFixed(2)}`,
      'Payment Method': t.paymentMethod,
      'Payment Status': t.paymentStatus,
      'Order Status': t.status,
      'User': t.userId?.name || 'N/A',
      'Email': t.email,
      'Date': new Date(t.createdAt).toLocaleDateString()
    }));

    const json2csvParser = new Parser();
    const csv = json2csvParser.parse(csvData);

    res.header('Content-Type', 'text/csv');
    res.header('Content-Disposition', `attachment; filename="finance_${new Date().toISOString().split('T')[0]}.csv"`);
    res.send(csv);
  } catch (error) {
    console.error('Export finance error:', error);
    res.status(500).json({ success: false, message: 'Internal server error' });
  }
};

// 💸 Process Payout (Mark transaction as completed)
export const processPayout = async (req, res) => {
  try {
    const { transactionId } = req.params;
    const { notes } = req.body;

    const transaction = await Transaction.findById(transactionId);
    if (!transaction) {
      return res.status(404).json({
        success: false,
        message: 'Transaction not found'
      });
    }

    if (transaction.paymentStatus === 'paid') {
      return res.status(400).json({
        success: false,
        message: 'Transaction already completed'
      });
    }

    // ✅ Update transaction to paid
    transaction.paymentStatus = 'paid';
    transaction.status = 'Delivered';
    await transaction.save();

    // ✅ Also update order if exists
    if (transaction.orderId) {
      await Order.findByIdAndUpdate(transaction.orderId, {
        paymentStatus: 'Paid',
        $push: {
          statusHistory: {
            status: 'Payment Confirmed',
            timestamp: new Date(),
            note: notes || 'Payout processed'
          }
        }
      });
    }

    res.status(200).json({
      success: true,
      message: 'Payout processed successfully',
      data: transaction
    });
  } catch (error) {
    console.error('Process payout error:', error);
    res.status(500).json({ success: false, message: 'Internal server error' });
  }
};

// 🔄 Process Refund
export const processRefund = async (req, res) => {
  try {
    const { orderId } = req.params;
    const { amount, reason } = req.body;

    const order = await Order.findById(orderId);
    if (!order) {
      return res.status(404).json({
        success: false,
        message: 'Order not found'
      });
    }

    if (order.paymentStatus === 'Refunded') {
      return res.status(400).json({
        success: false,
        message: 'Order already refunded'
      });
    }

    // ✅ Update order
    order.paymentStatus = 'Refunded';
    order.refundAmount = amount || order.totalAmount;
    order.refundReason = reason;
    order.refundId = `REF${Date.now()}`;
    order.statusHistory.push({
      status: 'Refunded',
      timestamp: new Date(),
      note: reason
    });
    await order.save();

    // ✅ Update transaction
    await Transaction.updateOne(
      { orderId: order._id },
      {
        paymentStatus: 'refunded',
        refundAmount: amount || order.totalAmount,
        refundDate: new Date(),
        refundReason: reason
      }
    );

    res.status(200).json({
      success: true,
      message: 'Refund processed successfully',
      data: order
    });
  } catch (error) {
    console.error('Process refund error:', error);
    res.status(500).json({ success: false, message: 'Internal server error' });
  }
};

// // 📊 Get Withdrawal Summary
// export const getWithdrawalSummary = async (req, res) => {
//   try {
//     // Total paid amount
//     const paidTransactions = await Transaction.aggregate([
//       { $match: { paymentStatus: 'paid' } },
//       { $group: { _id: null, total: { $sum: '$totalAmount' } } }
//     ]);

//     // Pending withdrawals
//     const pendingTransactions = await Transaction.aggregate([
//       { $match: { paymentStatus: 'pending' } },
//       { $group: { _id: null, total: { $sum: '$totalAmount' } } }
//     ]);

//     // Refunded amount
//     const refundedOrders = await Order.aggregate([
//       { $match: { paymentStatus: 'Refunded' } },
//       { $group: { _id: null, total: { $sum: '$refundAmount' } } }
//     ]);

//     res.status(200).json({
//       success: true,
//       data: {
//         totalPaid: paidTransactions[0]?.total || 0,
//         pendingWithdrawal: pendingTransactions[0]?.total || 0,
//         totalRefunded: refundedOrders[0]?.total || 0,
//         availableBalance: (paidTransactions[0]?.total || 0) - (refundedOrders[0]?.total || 0)
//       }
//     });
//   } catch (error) {
//     console.error('Get withdrawal summary error:', error);
//     res.status(500).json({ success: false, message: 'Internal server error' });
//   }
// };


// ==================== WITHDRAWAL CONTROLLER ====================


// ==================== GET WITHDRAWAL SUMMARY ====================
export const getWithdrawalSummary = async (req, res) => {
  try {
    const admin = req.user;
    if (!admin || admin.role !== 'admin') {
      return res.status(403).json({
        success: false,
        message: 'Unauthorized. Admin access required.',
      });
    }

    // Total Withdrawals (all completed)
    const totalResult = await Withdrawal.aggregate([
      { $match: { paymentStatus: 'Completed' } },
      { $group: { _id: null, total: { $sum: '$requestedAmount' } } },
    ]);
    const totalWithdrawals = totalResult[0]?.total || 0;

    // Pending Withdrawals
    const pendingResult = await Withdrawal.aggregate([
      { $match: { paymentStatus: 'Pending' } },
      { $group: { _id: null, total: { $sum: '$requestedAmount' } } },
    ]);
    const pendingWithdrawals = pendingResult[0]?.total || 0;

    // Invoice Count (Approved/Completed)
    const invoiceCount = await Withdrawal.countDocuments({
      paymentStatus: { $in: ['Approved', 'Completed'] },
    });

    // Rejected
    const rejectedResult = await Withdrawal.aggregate([
      { $match: { paymentStatus: 'Rejected' } },
      { $group: { _id: null, total: { $sum: '$requestedAmount' } } },
    ]);
    const rejectedAmount = rejectedResult[0]?.total || 0;

    // Calculate percentage changes (last 30 days vs previous 30 days)
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
    const sixtyDaysAgo = new Date();
    sixtyDaysAgo.setDate(sixtyDaysAgo.getDate() - 60);

    const currentPeriod = await Withdrawal.aggregate([
      { $match: { createdAt: { $gte: thirtyDaysAgo }, paymentStatus: 'Completed' } },
      { $group: { _id: null, total: { $sum: '$requestedAmount' } } },
    ]);

    const previousPeriod = await Withdrawal.aggregate([
      { $match: { createdAt: { $gte: sixtyDaysAgo, $lt: thirtyDaysAgo }, paymentStatus: 'Completed' } },
      { $group: { _id: null, total: { $sum: '$requestedAmount' } } },
    ]);

    const current = currentPeriod[0]?.total || 0;
    const previous = previousPeriod[0]?.total || 1;
    const changePercentage = Math.round(((current - previous) / previous) * 100);

    return res.status(200).json({
      success: true,
      data: {
        totalWithdrawals: Math.round(totalWithdrawals),
        pendingWithdrawals: Math.round(pendingWithdrawals),
        invoiceCount,
        rejectedAmount: Math.round(rejectedAmount),
        changePercentage,
      },
    });
  } catch (error) {
    console.error('Get withdrawal summary error:', error);
    return res.status(500).json({
      success: false,
      message: error.message || 'Internal server error',
    });
  }
};

// ==================== GET ALL WITHDRAWALS ====================
export const getAllWithdrawals = async (req, res) => {
  try {
    const { seller, status, paymentMethod, startDate, endDate, search } = req.query;

    let filter = {};

    // Seller filter
    if (seller && mongoose.Types.ObjectId.isValid(seller)) {
      filter.seller = seller;
    }

    // Status filter
    if (status) {
      filter.paymentStatus = status;
    }

    // Payment method filter
    if (paymentMethod) {
      filter.paymentMethod = paymentMethod;
    }

    // Date range filter
    if (startDate || endDate) {
      filter.requestedDate = {};
      if (startDate) filter.requestedDate.$gte = new Date(startDate);
      if (endDate) filter.requestedDate.$lte = new Date(endDate);
    }

    // Search filter (by withdrawal ID)
    if (search) {
      filter.withdrawalId = { $regex: search, $options: 'i' };
    }

    const withdrawals = await Withdrawal.find(filter)
      .populate('seller', 'name email shopName phone')
      .populate('processedBy', 'name email')
      .sort({ createdAt: -1 });

    return res.status(200).json({
      success: true,
      data: withdrawals,
      count: withdrawals.length,
    });
  } catch (error) {
    console.error('Get withdrawals error:', error);
    return res.status(500).json({
      success: false,
      message: error.message || 'Internal server error',
    });
  }
};

// ==================== GET SINGLE WITHDRAWAL ====================
export const getSingleWithdrawal = async (req, res) => {
  try {
    const { id } = req.params;

    const withdrawal = await Withdrawal.findById(id)
      .populate('seller', 'name email shopName phone address')
      .populate('processedBy', 'name email')
      .populate('statusHistory.updatedBy', 'name');

    if (!withdrawal) {
      return res.status(404).json({
        success: false,
        message: 'Withdrawal not found',
      });
    }

    return res.status(200).json({
      success: true,
      data: withdrawal,
    });
  } catch (error) {
    console.error('Get withdrawal error:', error);
    return res.status(500).json({
      success: false,
      message: error.message || 'Internal server error',
    });
  }
};

// ==================== CREATE WITHDRAWAL REQUEST ====================
export const createWithdrawalRequest = async (req, res) => {
  try {
    const seller = req.user; // Assuming seller is authenticated

    if (!seller || seller.role !== 'seller') {
      return res.status(403).json({
        success: false,
        message: 'Unauthorized. Seller access required.',
      });
    }

    const {
      requestedAmount,
      paymentMethod,
      note,
      bankDetails,
      upiId,
      paypalEmail,
    } = req.body;

    if (!requestedAmount || requestedAmount <= 0) {
      return res.status(400).json({
        success: false,
        message: 'Valid requested amount is required',
      });
    }

    // Check seller balance (implement your logic here)
    // const sellerBalance = await getSellerBalance(seller._id);
    // if (sellerBalance < requestedAmount) {
    //   return res.status(400).json({
    //     success: false,
    //     message: 'Insufficient balance',
    //   });
    // }

    const withdrawal = await Withdrawal.create({
      seller: seller._id,
      requestedAmount,
      paymentMethod: paymentMethod || 'Wallet',
      note,
      bankDetails,
      upiId,
      paypalEmail,
      paymentStatus: 'Pending',
    });

    await withdrawal.populate('seller', 'name email shopName');

    return res.status(201).json({
      success: true,
      message: 'Withdrawal request created successfully',
      data: withdrawal,
    });
  } catch (error) {
    console.error('Create withdrawal error:', error);
    return res.status(500).json({
      success: false,
      message: error.message || 'Internal server error',
    });
  }
};

// ==================== UPDATE WITHDRAWAL STATUS ====================
export const updateWithdrawalStatus = async (req, res) => {
  try {
    const admin = req.user;

    if (!admin || admin.role !== 'admin') {
      return res.status(403).json({
        success: false,
        message: 'Unauthorized. Admin access required.',
      });
    }

    const { id } = req.params;
    const { paymentStatus, note, rejectionReason, transactionId } = req.body;

    const withdrawal = await Withdrawal.findById(id);

    if (!withdrawal) {
      return res.status(404).json({
        success: false,
        message: 'Withdrawal not found',
      });
    }

    // Update status
    withdrawal.paymentStatus = paymentStatus;

    if (paymentStatus === 'Rejected' && rejectionReason) {
      withdrawal.rejectionReason = rejectionReason;
    }

    if (paymentStatus === 'Completed') {
      withdrawal.payoutDate = new Date();
      withdrawal.transactionId = transactionId;
    }

    withdrawal.processedBy = admin._id;
    withdrawal.processedAt = new Date();

    // Add to history
    withdrawal.statusHistory.push({
      status: paymentStatus,
      note: note || rejectionReason,
      updatedBy: admin._id,
      timestamp: new Date(),
    });

    await withdrawal.save();
    await withdrawal.populate('seller', 'name email shopName');
    await withdrawal.populate('processedBy', 'name email');

    return res.status(200).json({
      success: true,
      message: `Withdrawal ${paymentStatus.toLowerCase()} successfully`,
      data: withdrawal,
    });
  } catch (error) {
    console.error('Update withdrawal error:', error);
    return res.status(500).json({
      success: false,
      message: error.message || 'Internal server error',
    });
  }
};

// ==================== APPROVE WITHDRAWAL (PAYOUT) ====================
export const approveWithdrawal = async (req, res) => {
  try {
    const admin = req.user;

    if (!admin || admin.role !== 'admin') {
      return res.status(403).json({
        success: false,
        message: 'Unauthorized. Admin access required.',
      });
    }

    const { id } = req.params;
    const { transactionId, note } = req.body;

    const withdrawal = await Withdrawal.findById(id);

    if (!withdrawal) {
      return res.status(404).json({
        success: false,
        message: 'Withdrawal not found',
      });
    }

    if (withdrawal.paymentStatus !== 'Pending' && withdrawal.paymentStatus !== 'Approved') {
      return res.status(400).json({
        success: false,
        message: 'Only pending or approved withdrawals can be paid out',
      });
    }

    withdrawal.paymentStatus = 'Completed';
    withdrawal.payoutDate = new Date();
    withdrawal.transactionId = transactionId;
    withdrawal.processedBy = admin._id;
    withdrawal.processedAt = new Date();

    withdrawal.statusHistory.push({
      status: 'Completed',
      note: note || 'Payment completed',
      updatedBy: admin._id,
      timestamp: new Date(),
    });

    await withdrawal.save();
    await withdrawal.populate('seller', 'name email shopName');

    // TODO: Update seller wallet/balance here

    return res.status(200).json({
      success: true,
      message: 'Withdrawal paid out successfully',
      data: withdrawal,
    });
  } catch (error) {
    console.error('Approve withdrawal error:', error);
    return res.status(500).json({
      success: false,
      message: error.message || 'Internal server error',
    });
  }
};



// 💰 Get All Refunds
export const getRefunds = async (req, res) => {
  try {
    const {
      search,
      paymentMethod,
      status,
      dateFilter,
      page = 1,
      limit = 10
    } = req.query;

    const query = {
      paymentStatus: { $in: ['Refund Initiated', 'Refunded'] }
    };

    // Payment Method Filter
    if (paymentMethod) {
      query.paymentMethod = paymentMethod;
    }

    // Status Filter
    if (status) {
      query.paymentStatus = status;
    }

    // Date Filter
    if (dateFilter) {
      const now = new Date();
      let startDate;

      switch (dateFilter) {
        case 'today':
          startDate = new Date(now.setHours(0, 0, 0, 0));
          break;
        case 'week':
          startDate = new Date(now.setDate(now.getDate() - 7));
          break;
        case 'month':
          startDate = new Date(now.setMonth(now.getMonth() - 1));
          break;
        case 'year':
          startDate = new Date(now.setFullYear(now.getFullYear() - 1));
          break;
      }

      if (startDate) {
        query.createdAt = { $gte: startDate };
      }
    }

    // Search by order number or customer
    if (search) {
      const users = await User.find({
        $or: [
          { name: { $regex: search, $options: 'i' } },
          { email: { $regex: search, $options: 'i' } }
        ]
      }).select('_id');

      query.$or = [
        { orderNumber: { $regex: search, $options: 'i' } },
        { user: { $in: users.map(u => u._id) } }
      ];
    }

    const refunds = await Order.find(query)
      .populate('user', 'name email phone address')
      .populate('orderItems.product', 'name images')
      .sort({ createdAt: -1 })
      .limit(limit * 1)
      .skip((page - 1) * limit);

    const total = await Order.countDocuments(query);

    // Format response
    const formatted = refunds.map(order => ({
      _id: order._id,
      orderNumber: order.orderNumber,
      customerName: order.user?.name || order.shippingAddress?.fullName,
      customerEmail: order.user?.email,
      customerPhone: order.user?.phone || order.shippingAddress?.phone,
      customerAddress: order.shippingAddress?.addressLine,
      refundAmount: order.refundAmount || order.totalAmount,
      refundReason: order.refundReason,
      paymentMethod: order.paymentMethod,
      paymentStatus: order.paymentStatus,
      orderItems: order.orderItems,
      createdAt: order.createdAt,
      refundedAt: order.refundedAt,
    }));

    res.status(200).json({
      success: true,
      data: formatted,
      pagination: {
        total,
        page: Number(page),
        pages: Math.ceil(total / limit),
      }
    });
  } catch (error) {
    console.error('Get refunds error:', error);
    res.status(500).json({ success: false, message: 'Internal server error' });
  }
};

// 👁️ Get Single Refund Details
export const getRefundById = async (req, res) => {
  try {
    const { id } = req.params;

    const order = await Order.findById(id)
      .populate('user', 'name email phone address')
      .populate('orderItems.product', 'name images price');

    if (!order) {
      return res.status(404).json({
        success: false,
        message: 'Refund not found'
      });
    }

    if (!['Refund Initiated', 'Refunded'].includes(order.paymentStatus)) {
      return res.status(400).json({
        success: false,
        message: 'This is not a refund order'
      });
    }

    const formatted = {
      _id: order._id,
      orderNumber: order.orderNumber,
      customerName: order.user?.name || order.shippingAddress?.fullName,
      customerEmail: order.user?.email,
      customerPhone: order.user?.phone || order.shippingAddress?.phone,
      customerAddress: `${order.shippingAddress?.addressLine}, ${order.shippingAddress?.city}, ${order.shippingAddress?.state}`,
      refundAmount: order.refundAmount || order.totalAmount,
      refundReason: order.refundReason,
      refundId: order.refundId,
      paymentMethod: order.paymentMethod,
      paymentStatus: order.paymentStatus,
      orderItems: order.orderItems.map(item => ({
        _id: item._id,
        productName: item.product?.name || item.productName,
        quantity: item.quantity,
        price: item.price,
        color: item.color,
        size: item.size,
      })),
      subtotal: order.subtotal,
      shippingCost: order.shippingCost,
      tax: order.tax,
      totalAmount: order.totalAmount,
      createdAt: order.createdAt,
      refundedAt: order.refundedAt,
    };

    res.status(200).json({
      success: true,
      data: formatted
    });
  } catch (error) {
    console.error('Get refund details error:', error);
    res.status(500).json({ success: false, message: 'Internal server error' });
  }
};

// 📥 Export Refunds to CSV
export const exportRefunds = async (req, res) => {
  try {
    const refunds = await Order.find({
      paymentStatus: { $in: ['Refund Initiated', 'Refunded'] }
    })
      .populate('user', 'name email')
      .sort({ createdAt: -1 });

    const csvData = refunds.map(order => ({
      'Order ID': order.orderNumber,
      'Refund ID': order.refundId || 'N/A',
      'Customer': order.user?.name || order.shippingAddress?.fullName,
      'Email': order.user?.email || 'N/A',
      'Amount': `$${(order.refundAmount || order.totalAmount).toFixed(2)}`,
      'Payment Method': order.paymentMethod,
      'Status': order.paymentStatus,
      'Reason': order.refundReason || 'N/A',
      'Requested Date': new Date(order.createdAt).toLocaleDateString(),
      'Refunded Date': order.refundedAt ? new Date(order.refundedAt).toLocaleDateString() : 'N/A',
    }));

    const json2csvParser = new Parser();
    const csv = json2csvParser.parse(csvData);

    res.header('Content-Type', 'text/csv');
    res.header('Content-Disposition', `attachment; filename="refunds_${new Date().toISOString().split('T')[0]}.csv"`);
    res.send(csv);
  } catch (error) {
    console.error('Export refunds error:', error);
    res.status(500).json({ success: false, message: 'Internal server error' });
  }
};

// 📊 Get Refund Statistics
export const getRefundStats = async (req, res) => {
  try {
    const totalRefunded = await Order.aggregate([
      { $match: { paymentStatus: 'Refunded' } },
      { $group: { _id: null, total: { $sum: '$refundAmount' } } }
    ]);

    const totalPending = await Order.aggregate([
      { $match: { paymentStatus: 'Refund Initiated' } },
      { $group: { _id: null, total: { $sum: '$refundAmount' } } }
    ]);

    const totalCount = await Order.countDocuments({
      paymentStatus: { $in: ['Refund Initiated', 'Refunded'] }
    });

    res.status(200).json({
      success: true,
      data: {
        totalRefunded: totalRefunded[0]?.total || 0,
        totalPending: totalPending[0]?.total || 0,
        totalCount,
      }
    });
  } catch (error) {
    console.error('Get refund stats error:', error);
    res.status(500).json({ success: false, message: 'Internal server error' });
  }
}
