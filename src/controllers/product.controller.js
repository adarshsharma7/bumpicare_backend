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





