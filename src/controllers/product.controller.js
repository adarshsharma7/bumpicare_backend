import { asyncHandler } from "../utils/asyncHandler.js";
import { ApiError } from "../utils/ApiError.js";
import { ApiResponse } from "../utils/ApiResponse.js";
import Product from "../models/product.model.js";  // ✅ Model path adjust करना न भूलना

// ======================================================
// 🧠 GET — All Products (with category & search filter)
// ======================================================
export const getAllProducts = asyncHandler(async (req, res) => {

  const { category, search } = req.query;
  const query = {};

  if (category) query.category = category;
  if (search) query.name = { $regex: search, $options: "i" };

  const products = await Product.find(query)
    .populate("category")
    .sort({ createdAt: -1 });

  return res
    .status(200)
    .json(new ApiResponse(200, products, "Products fetched successfully"));
});


// ======================================================
// 🧩 GET — Single Product by ID
// ======================================================
export const getSingleProduct = asyncHandler(async (req, res) => {
  const { id } = req.params;


  const product = await Product.findById(id);
  if (!product) throw new ApiError(404, "Product not found");

  return res
    .status(200)
    .json(new ApiResponse(200, product, "Product fetched successfully"));
});


// ======================================================
// 🛠️ POST — Add New Product (Admin only)
// ======================================================
export const addProduct = asyncHandler(async (req, res) => {
  const admin = req.user;

  if (!admin || admin.role !== "admin") {
    throw new ApiError(401, "Unauthorized");
  }

  const { name, description, price, category, stock, images } = req.body;

  if (!name || !price || !category) {
    throw new ApiError(400, "Missing required fields");
  }

  const product = await Product.create({
    name,
    description,
    price,
    category,
    stock: stock || 0,
    images: images || [],
  });

  return res
    .status(201)
    .json(new ApiResponse(201, product, "Product added successfully"));
});


// ======================================================
// ✏️ PUT — Update Product (Admin only)
// ======================================================
export const updateProduct = asyncHandler(async (req, res) => {
  const admin = req.user;

  if (!admin || admin.role !== "admin") {
    throw new ApiError(401, "Unauthorized");
  }

  const { id } = req.params;
  const { name, description, price, category, stock, images } = req.body;

  const updated = await Product.findByIdAndUpdate(
    id,
    { name, description, price, category, stock, images },
    { new: true }
  );

  if (!updated) throw new ApiError(404, "Product not found");

  return res
    .status(200)
    .json(new ApiResponse(200, updated, "Product updated successfully"));
});


// ======================================================
// ❌ DELETE — Delete Product (Admin only)
// ======================================================
export const deleteProduct = asyncHandler(async (req, res) => {
  const admin = req.user;

  if (!admin || admin.role !== "admin") {
    throw new ApiError(401, "Unauthorized");
  }

  const { id } = req.params;

  const deleted = await Product.findByIdAndDelete(id);
  if (!deleted) throw new ApiError(404, "Product not found");

  return res
    .status(200)
    .json(new ApiResponse(200, null, "Product deleted successfully"));
});
