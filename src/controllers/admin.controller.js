import User from "../models/user.model.js";
import Product from "../models/product.model.js";
import Order from "../models/order.model.js";
import Category from "../models/category.model.js";
import Review from "../models/review.model.js";
import { ApiResponse } from "../utils/ApiResponse.js";
import { ApiError } from "../utils/ApiError.js";
import { asyncHandler } from "../utils/asyncHandler.js";

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
    const ordersByStatus = await Order.aggregate([
      {
        $group: {
          _id: "$orderStatus",
          count: { $sum: 1 },
        },
      },
    ]);

    // Low stock products (stock < 10)
    const lowStockProducts = await Product.find({ stock: { $lt: 10 } })
      .select("name stock")
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

    res.status(200).json({
      success: true,
      data: {
        totalUsers,
        totalProducts,
        totalOrders,
        totalRevenue,
        ordersByStatus,
        lowStockProducts,
        recentOrders,
        revenueByDate,
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


// ==================== GET SINGLE PRODUCT ====================
export const getSingleProduct = async (req, res) => {
  try {
    const { id } = req.params;

    const product = await Product.findById(id).populate("category", "name");

    if (!product) {
      return res.status(404).json({
        success: false,
        message: "Product not found",
      });
    }

    return res.status(200).json({
      success: true,
      data: product,
    });
  } catch (error) {
    console.error("Get product error:", error);
    return res.status(500).json({
      success: false,
      message: error.message || "Internal server error",
    });
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

// ==================== PRODUCTS ====================

// 📦 Get All Products (Admin view with filters)
export const getAdminProducts = async (req, res) => {
  try {
    const { search, category, isActive, page = 1, limit = 20 } = req.query;
    const query = {};

    if (search) {
      query.name = { $regex: search, $options: "i" };
    }

    if (category) {
      query.category = category;
    }

    if (isActive !== undefined) {
      query.isActive = isActive === "true";
    }

    const products = await Product.find(query)
      .populate("category", "name")
      .sort({ createdAt: -1 })
      .limit(limit * 1)
      .skip((page - 1) * limit);

    const total = await Product.countDocuments(query);

    res.status(200).json({
      success: true,
      data: products,
      pagination: {
        total,
        page: Number(page),
        pages: Math.ceil(total / limit),
      },
    });
  } catch (error) {
    console.error("Get admin products error:", error);
    res.status(500).json({ success: false, message: "Internal server error" });
  }
};

// 🔄 Toggle Product Status (Active/Inactive)
export const toggleProductStatus = async (req, res) => {
  try {
    const { id } = req.params;
    const product = await Product.findById(id);

    if (!product) {
      return res.status(404).json({ success: false, message: "Product not found" });
    }

    product.isActive = !product.isActive;
    await product.save();

    res.status(200).json({
      success: true,
      message: `Product ${product.isActive ? "activated" : "deactivated"} successfully`,
      data: product,
    });
  } catch (error) {
    console.error("Toggle product status error:", error);
    res.status(500).json({ success: false, message: "Internal server error" });
  }
};

// 📊 Bulk Update Stock
export const bulkUpdateStock = async (req, res) => {
  try {
    const { updates } = req.body; // [{ productId, stock }, ...]

    const bulkOps = updates.map((item) => ({
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
    console.error("Bulk update stock error:", error);
    res.status(500).json({ success: false, message: "Internal server error" });
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

// ==================== ADD PRODUCT ====================
export const addProduct = async (req, res) => {
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
    } = req.body;

    // Validate required fields
    if (!name || !price || !category) {
      return res.status(400).json({
        success: false,
        message: "Name, price, and category are required",
      });
    }

    // Create product
    const product = await Product.create({
      name,
      description,
      price,
      discountPrice: discountPrice || null,
      category,
      stock: stock || 0,
      images: images || [],
      brand: brand || "Generic",
      colors: colors || [],
      sizes: sizes || [],
      specifications: specifications || [],
      keyInfo: keyInfo || [],
      isActive: true,
    });

    // Populate category
    await product.populate("category", "name");

    return res.status(201).json({
      success: true,
      message: "Product added successfully",
      data: product,
    });
  } catch (error) {
    console.error("Add product error:", error);
    return res.status(500).json({
      success: false,
      message: error.message || "Internal server error",
    });
  }
};

// ==================== UPDATE PRODUCT ====================
export const updateProduct = async (req, res) => {
  try {
    const admin = req.user;

    if (!admin || admin.role !== "admin") {
      return res.status(403).json({
        success: false,
        message: "Unauthorized. Admin access required.",
      });
    }

    const { id } = req.params;

    // Find product first
    const product = await Product.findById(id);
    if (!product) {
      return res.status(404).json({
        success: false,
        message: "Product not found",
      });
    }

    // Update only provided fields
    const {
      name,
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
      isActive,
    } = req.body;

    // Update fields conditionally
    if (name !== undefined) product.name = name;
    if (description !== undefined) product.description = description;
    if (price !== undefined) product.price = price;
    if (discountPrice !== undefined) product.discountPrice = discountPrice;
    if (category !== undefined) product.category = category;
    if (stock !== undefined) product.stock = stock;
    if (images !== undefined) product.images = images;
    if (brand !== undefined) product.brand = brand;
    if (colors !== undefined) product.colors = colors;
    if (sizes !== undefined) product.sizes = sizes;
    if (specifications !== undefined) product.specifications = specifications;
    if (keyInfo !== undefined) product.keyInfo = keyInfo;
    if (isActive !== undefined) product.isActive = isActive;

    // Save updated product
    await product.save();

    // Populate category
    await product.populate("category", "name");

    return res.status(200).json({
      success: true,
      message: "Product updated successfully",
      data: product,
    });
  } catch (error) {
    console.error("Update product error:", error);
    return res.status(500).json({
      success: false,
      message: error.message || "Internal server error",
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

// ⭐ Get All Reviews
export const getAllReviews = async (req, res) => {
  try {
    const { productId, page = 1, limit = 20 } = req.query;
    const query = {};

    if (productId) {
      query.product = productId;
    }

    const reviews = await Review.find(query)
      .populate("user", "name email")
      .populate("product", "name images")
      .sort({ createdAt: -1 })
      .limit(limit * 1)
      .skip((page - 1) * limit);

    const total = await Review.countDocuments(query);

    res.status(200).json({
      success: true,
      data: reviews,
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

// 🗑️ Delete Review
export const deleteReview = async (req, res) => {
  try {
    const { id } = req.params;

    const review = await Review.findByIdAndDelete(id);
    if (!review) {
      return res.status(404).json({ success: false, message: "Review not found" });
    }

    // Update product ratings
    const product = await Product.findById(review.product);
    if (product) {
      const reviews = await Review.find({ product: review.product });
      product.reviewsCount = reviews.length;
      product.ratings =
        reviews.length > 0
          ? reviews.reduce((sum, r) => sum + r.rating, 0) / reviews.length
          : 0;
      await product.save();
    }

    res.status(200).json({
      success: true,
      message: "Review deleted successfully",
    });
  } catch (error) {
    console.error("Delete review error:", error);
    res.status(500).json({ success: false, message: "Internal server error" });
  }
};