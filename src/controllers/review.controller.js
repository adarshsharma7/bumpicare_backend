import { asyncHandler } from "../utils/asyncHandler.js";
import { ApiError } from "../utils/ApiError.js";
import { ApiResponse } from "../utils/ApiResponse.js";
import Review from "../models/review.model.js";
import Product from "../models/product.model.js";
import { uploadBufferToCloudinary, deleteFromCloudinary } from "../utils/cloudinary.js";

/**
 * GET — get reviews for a product
 */
export const getReviews = asyncHandler(async (req, res) => {
  const { productId } = req.params;
  if (!productId) throw new ApiError(400, "Product ID required");

  const reviews = await Review.find({ product: productId })
    .populate("user", "name email")
    .sort({ createdAt: -1 });

  return res.status(200).json(new ApiResponse(200, reviews, "Reviews fetched successfully"));
});

/**
 * POST — add review (multipart/form-data possible)
 * Expects fields: productId, rating, comment
 * Files: images (optional)
 */
export const addReview = asyncHandler(async (req, res) => {
  const authUser = req.user;
  if (!authUser) throw new ApiError(401, "Unauthorized");

  const { productId, rating, comment } = req.body;
  if (!productId || !rating) throw new ApiError(400, "Product ID and rating are required");

  // check if already reviewed
  const existing = await Review.findOne({ user: authUser._id, product: productId });
  if (existing) {
    return res.status(200).json(new ApiResponse(200, null, "You already reviewed this product"));
  }

  // handle file uploads (if any)
  const images = [];
  if (req.files && req.files.length > 0) {
    for (const f of req.files) {
      const uploaded = await uploadBufferToCloudinary(f.buffer, "reviews");
      images.push(uploaded); // { url, public_id }
    }
  }
  console.log("review file ", req.files);
  const review = await Review.create({
    user: authUser._id,
    product: productId,
    rating: Number(rating),
    comment,
    images,
  });

  // update product avg rating & reviewsCount
  const allReviews = await Review.find({ product: productId });
  const avgRating = allReviews.reduce((a, r) => a + r.rating, 0) / allReviews.length;
  await Product.findByIdAndUpdate(productId, {
    ratings: avgRating,
    reviewsCount: allReviews.length,
  });

  const populated = await Review.findById(review._id).populate("user", "name email");
  return res.status(201).json(new ApiResponse(201, populated, "Review added successfully"));
});

/**
 * PUT — update review (can add images or remove)
 * Expects: reviewId, rating (optional), comment (optional), removeImageIds (optional comma-separated public_ids)
 * Files: images (optional new files to add)
 */
export const updateReview = asyncHandler(async (req, res) => {
  const authUser = req.user;
  if (!authUser) throw new ApiError(401, "Unauthorized");

  const { reviewId, rating, comment, removeImageIds } = req.body;
  if (!reviewId) throw new ApiError(400, "Review ID required");

  const review = await Review.findOne({ _id: reviewId, user: authUser._id });
  if (!review) throw new ApiError(404, "Review not found");

  // Remove specified images (if any)
  if (removeImageIds) {
    // expect comma separated public_ids
    const idsToRemove = removeImageIds.split(',').map(s => s.trim()).filter(Boolean);
    if (idsToRemove.length) {
      review.images = review.images.filter(img => {
        if (idsToRemove.includes(img.public_id)) {
          // delete from cloudinary async (don't block)
          deleteFromCloudinary(img.public_id);
          return false;
        }
        return true;
      });
    }
  }

  // Upload new images if any
  if (req.files && req.files.length) {
    for (const f of req.files) {
      const uploaded = await uploadBufferToCloudinary(f.buffer, "reviews");
      review.images.push(uploaded);
    }
    // limit to max 4 images stored
    if (review.images.length > 4) {
      // optionally delete extras from Cloudinary (keep first 4)
      const extras = review.images.splice(4);
      for (const ex of extras) {
        deleteFromCloudinary(ex.public_id);
      }
    }
  }

  review.rating = rating ? Number(rating) : review.rating;
  review.comment = comment ?? review.comment;

  await review.save();

  // Update product average rating
  const allReviews = await Review.find({ product: review.product });
  const avgRating = allReviews.reduce((a, r) => a + r.rating, 0) / allReviews.length;
  await Product.findByIdAndUpdate(review.product, { ratings: avgRating });

  const populated = await Review.findById(review._id).populate("user", "name email");
  return res.status(200).json(new ApiResponse(200, populated, "Review updated successfully"));
});

/**
 * DELETE — delete review (auth user only)
 * query param: ?id=REVIEW_ID
 */
export const deleteReview = asyncHandler(async (req, res) => {
  const authUser = req.user;
  if (!authUser) throw new ApiError(401, "Unauthorized");

  const { id } = req.query;
  if (!id) throw new ApiError(400, "Review ID required");

  const review = await Review.findOneAndDelete({ _id: id, user: authUser._id });
  if (!review) throw new ApiError(404, "Review not found");

  // delete attached images from cloudinary (best effort)
  if (review.images && review.images.length) {
    for (const img of review.images) {
      if (img.public_id) {
        deleteFromCloudinary(img.public_id);
      }
    }
  }

  // update product ratings
  const allReviews = await Review.find({ product: review.product });
  const avgRating = allReviews.length ? (allReviews.reduce((a, r) => a + r.rating, 0) / allReviews.length) : 0;
  await Product.findByIdAndUpdate(review.product, { ratings: avgRating, reviewsCount: allReviews.length });

  return res.status(200).json(new ApiResponse(200, null, "Review deleted successfully"));
});
