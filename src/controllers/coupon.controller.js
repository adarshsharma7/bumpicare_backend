// controllers/coupon.controller.js
import { asyncHandler } from "../utils/asyncHandler.js";
import { ApiError } from "../utils/ApiError.js";
import { ApiResponse } from "../utils/ApiResponse.js";
import Coupon from "../models/Coupon.js";
import Product from "../models/product.model.js";
import Cart from "../models/cart.model.js";

// ✅ GET - Get all active coupons (for user)
export const getActiveCoupons = asyncHandler(async (req, res) => {
  const now = new Date();
  const coupons = await Coupon.find({
    isActive: true,
    startDate: { $lte: now },
    endDate: { $gte: now },
    $or: [
      { usageLimit: null },
      { $expr: { $lt: ["$usedCount", "$usageLimit"] } }
    ]
  })
    .select('code description discountType discountValue minOrderValue maxDiscountAmount endDate')
    .sort({ createdAt: -1 });

  return res
    .status(200)
    .json(new ApiResponse(200, coupons, "Active coupons fetched successfully"));
});

// ✅ POST - Apply coupon to cart
export const applyCoupon = asyncHandler(async (req, res) => {
  const { code, cartTotal } = req.body;
  const userId = req.user._id;

  if (!code) throw new ApiError(400, "Coupon code is required");
  if (!cartTotal) throw new ApiError(400, "Cart total is required");

  // Find coupon
  const coupon = await Coupon.findOne({
    code: code.toUpperCase(),
    isActive: true
  });

  if (!coupon) throw new ApiError(404, "Invalid coupon code");

  // Check if coupon is expired
  const now = new Date();
  if (now < coupon.startDate || now > coupon.endDate) {
    throw new ApiError(400, "Coupon has expired or not yet valid");
  }

  // Check usage limit
  if (coupon.usageLimit && coupon.usedCount >= coupon.usageLimit) {
    throw new ApiError(400, "Coupon usage limit exceeded");
  }

  // Check minimum order value
  if (cartTotal < coupon.minOrderValue) {
    throw new ApiError(
      400,
      `Minimum order value of ₹${coupon.minOrderValue} required`
    );
  }

  // Check user-specific usage (if needed - optional for now)
  // You can track per-user usage in orders later

  // Check applicable products/categories (if specified)
  if (coupon.applicableFor !== 'all') {
    const cart = await Cart.findOne({ user: userId }).populate('items.product');

    if (coupon.applicableFor === 'specific-products') {
      const hasApplicable = cart.items.some(item =>
        coupon.applicableProducts.some(p => p.toString() === item.product._id.toString())
      );
      if (!hasApplicable) {
        throw new ApiError(400, "Coupon not applicable for cart items");
      }
    }

    if (coupon.applicableFor === 'specific-categories') {
      const hasApplicable = cart.items.some(item =>
        coupon.applicableCategories.some(c => c.toString() === item.product.category.toString())
      );
      if (!hasApplicable) {
        throw new ApiError(400, "Coupon not applicable for cart items");
      }
    }
  }

  // Calculate discount
  let discountAmount = 0;
  if (coupon.discountType === 'percentage') {
    discountAmount = (cartTotal * coupon.discountValue) / 100;
    // Apply max discount cap if exists
    if (coupon.maxDiscountAmount && discountAmount > coupon.maxDiscountAmount) {
      discountAmount = coupon.maxDiscountAmount;
    }
  } else if (coupon.discountType === 'fixed') {
    discountAmount = coupon.discountValue;
  }

  // Don't allow discount greater than cart total
  discountAmount = Math.min(discountAmount, cartTotal);

  return res.status(200).json(
    new ApiResponse(200, {
      couponCode: coupon.code,
      discountType: coupon.discountType,
      discountValue: coupon.discountValue,
      discountAmount,
      finalAmount: cartTotal - discountAmount
    }, "Coupon applied successfully")
  );
});

// ✅ POST - Remove coupon (just return success, actual removal is client-side)
export const removeCoupon = asyncHandler(async (req, res) => {
  return res
    .status(200)
    .json(new ApiResponse(200, null, "Coupon removed successfully"));
});