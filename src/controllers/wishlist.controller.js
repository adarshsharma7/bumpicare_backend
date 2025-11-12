import { asyncHandler } from "../utils/asyncHandler.js";
import { ApiError } from "../utils/ApiError.js";
import { ApiResponse } from "../utils/ApiResponse.js";
import  User  from "../models/user.model.js";
import Product  from "../models/product.model.js";


// 💖 Add to Wishlist
export const addToWishlist = asyncHandler(async (req, res) => {
  const user = req.user;
  const { productId } = req.body;

  if (!productId) throw new ApiError(400, "Product ID is required");

  const product = await Product.findById(productId).select("_id name");
  if (!product) throw new ApiError(404, "Product not found");

  const dbUser = await User.findById(user._id);

  dbUser.wishlist = dbUser.wishlist || [];


  if (!dbUser.wishlist.find((id) => id.toString() === productId.toString())) {
    dbUser.wishlist.push(product._id);
    await dbUser.save();
  }

  return res
    .status(200)
    .json(new ApiResponse(200, dbUser.wishlist, "Product added to wishlist"));
});


// 💖 Remove from Wishlist
export const removeFromWishlist = asyncHandler(async (req, res) => {
  const user = req.user;
  const { productId } = req.body;

  if (!productId) throw new ApiError(400, "Product ID is required");

  const dbUser = await User.findById(user._id);
  dbUser.wishlist = (dbUser.wishlist || []).filter(
    (id) => id.toString() !== productId.toString()
  );

  await dbUser.save();

  return res
    .status(200)
    .json(new ApiResponse(200, dbUser.wishlist, "Product removed from wishlist"));
});


// 💖 Get Wishlist
export const getWishlist = asyncHandler(async (req, res) => {
  const user = req.user;

  const dbUser = await User.findById(user._id).populate({
    path: "wishlist",
    select: "name price images",
  });

  return res
    .status(200)
    .json(new ApiResponse(200, dbUser.wishlist || [], "Wishlist fetched successfully"));
});
