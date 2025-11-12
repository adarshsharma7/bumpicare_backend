import { asyncHandler } from "../utils/asyncHandler.js";
import { ApiError } from "../utils/ApiError.js";
import { ApiResponse } from "../utils/ApiResponse.js";
import  Review  from "../models/review.model.js";
import  Product  from "../models/product.model.js";

// 🧠 GET — Get all reviews for a product
export const getReviews = asyncHandler(async (req, res) => {
  const { productId } = req.params;

  if (!productId) throw new ApiError(400, "Product ID required");

  const reviews = await Review.find({ product: productId })
    .populate("user", "name email")
    .sort({ createdAt: -1 });

  return res
    .status(200)
    .json(new ApiResponse(200, reviews, "Reviews fetched successfully"));
});

// ✍️ POST — Add a new review
export const addReview = asyncHandler(async (req, res) => {
  const authUser = req.user;
  if (!authUser) throw new ApiError(401, "Unauthorized");

  const { productId, rating, comment } = req.body;
  if (!productId || !rating)
    throw new ApiError(400, "Product ID and rating are required");

  // check if already reviewed
  const existing = await Review.findOne({ user: authUser._id, product: productId });
  if (existing)
    return res
      .status(200)
      .json(new ApiResponse(200, null, "You already reviewed this product"));

  const review = await Review.create({
    user: authUser._id,
    product: productId,
    rating,
    comment,
  });

  // update product average rating
  const reviews = await Review.find({ product: productId });
  const avgRating = reviews.reduce((a, r) => a + r.rating, 0) / reviews.length;
  await Product.findByIdAndUpdate(productId, { ratings: avgRating });

  return res
    .status(201)
    .json(new ApiResponse(201, review, "Review added successfully"));
});

// ✏️ PUT — Update a review
export const updateReview = asyncHandler(async (req, res) => {
  const authUser = req.user;
  if (!authUser) throw new ApiError(401, "Unauthorized");

  const { reviewId, rating, comment } = req.body;
  if (!reviewId) throw new ApiError(400, "Review ID required");

  const review = await Review.findOne({ _id: reviewId, user: authUser._id });
  if (!review) throw new ApiError(404, "Review not found");

  review.rating = rating ?? review.rating;
  review.comment = comment ?? review.comment;
  await review.save();

  return res
    .status(200)
    .json(new ApiResponse(200, review, "Review updated successfully"));
});

// 🗑️ DELETE — Delete a review
export const deleteReview = asyncHandler(async (req, res) => {
  const authUser = req.user;
  if (!authUser) throw new ApiError(401, "Unauthorized");

  const { id } = req.query;
  if (!id) throw new ApiError(400, "Review ID required");

  const review = await Review.findOneAndDelete({ _id: id, user: authUser._id });
  if (!review) throw new ApiError(404, "Review not found");

  return res
    .status(200)
    .json(new ApiResponse(200, null, "Review deleted successfully"));
});
