// ============================================
// 📁 controllers/subscription.controller.js
// ============================================

import SubscriptionPlan from "../models/subscription-plan.model.js";
import UserSubscription from "../models/user-subscription.model.js";
import Feature from "../models/feature.model.js";
import User from "../models/user.model.js";
import {asyncHandler} from "../utils/asyncHandler.js";
import {ApiError} from "../utils/ApiError.js";
import {ApiResponse} from "../utils/ApiResponse.js";

// ==================== ADMIN CONTROLLERS ====================

// Get all subscription plans (Admin)
export const getAllPlans = asyncHandler(async (req, res) => {
  const plans = await SubscriptionPlan.find().sort({ displayOrder: 1 });
  
  return res.status(200).json(
    new ApiResponse(200, plans, "Plans fetched successfully")
  );
});

// Create subscription plan (Admin)
export const createPlan = asyncHandler(async (req, res) => {
  const {
    name,
    displayName,
    description,
    tagline,
    price,
    duration,
    billingCycle,
    features,
    color,
    icon,
    badge,
    displayOrder
  } = req.body;

  // Validate required fields
  if (!name || !displayName || !description || price === undefined || !duration) {
    throw new ApiError(400, "Required fields missing");
  }

  const plan = await SubscriptionPlan.create({
    name,
    displayName,
    description,
    tagline,
    price,
    duration,
    billingCycle,
    features,
    color,
    icon,
    badge,
    displayOrder
  });

  return res.status(201).json(
    new ApiResponse(201, plan, "Plan created successfully")
  );
});

// Update subscription plan (Admin)
export const updatePlan = asyncHandler(async (req, res) => {
  const { id } = req.params;
  const updateData = req.body;

  const plan = await SubscriptionPlan.findByIdAndUpdate(
    id,
    { $set: updateData },
    { new: true, runValidators: true }
  );

  if (!plan) {
    throw new ApiError(404, "Plan not found");
  }

  return res.status(200).json(
    new ApiResponse(200, plan, "Plan updated successfully")
  );
});

// Delete subscription plan (Admin)
export const deletePlan = asyncHandler(async (req, res) => {
  const { id } = req.params;

  // Check if any users are currently on this plan
  const activeUsers = await UserSubscription.countDocuments({ 
    currentPlan: id,
    status: "active" 
  });

  if (activeUsers > 0) {
    throw new ApiError(
      400, 
      `Cannot delete plan. ${activeUsers} users are currently subscribed.`
    );
  }

  const plan = await SubscriptionPlan.findByIdAndDelete(id);

  if (!plan) {
    throw new ApiError(404, "Plan not found");
  }

  return res.status(200).json(
    new ApiResponse(200, null, "Plan deleted successfully")
  );
});

// Toggle plan status (Admin)
export const togglePlanStatus = asyncHandler(async (req, res) => {
  const { id } = req.params;

  const plan = await SubscriptionPlan.findById(id);
  if (!plan) {
    throw new ApiError(404, "Plan not found");
  }

  plan.isActive = !plan.isActive;
  await plan.save();

  return res.status(200).json(
    new ApiResponse(200, plan, `Plan ${plan.isActive ? 'activated' : 'deactivated'}`)
  );
});

// Set default plan (Admin)
export const setDefaultPlan = asyncHandler(async (req, res) => {
  const { id } = req.params;

  const plan = await SubscriptionPlan.findById(id);
  if (!plan) {
    throw new ApiError(404, "Plan not found");
  }

  // Remove default from all plans
  await SubscriptionPlan.updateMany({}, { $set: { isDefault: false } });
  
  // Set this as default
  plan.isDefault = true;
  await plan.save();

  return res.status(200).json(
    new ApiResponse(200, plan, "Default plan set successfully")
  );
});

// Get all user subscriptions (Admin)
export const getAllUserSubscriptions = asyncHandler(async (req, res) => {
  const { page = 1, limit = 20, status, search } = req.query;

  const query = {};
  if (status) query.status = status;

  const subscriptions = await UserSubscription.find(query)
    .populate("user", "name email phone")
    .populate("currentPlan", "name displayName price")
    .sort({ createdAt: -1 })
    .limit(limit * 1)
    .skip((page - 1) * limit);

  const total = await UserSubscription.countDocuments(query);

  return res.status(200).json(
    new ApiResponse(200, {
      subscriptions,
      totalPages: Math.ceil(total / limit),
      currentPage: page,
      total
    }, "User subscriptions fetched successfully")
  );
});

// Manually assign subscription to user (Admin)
export const assignSubscriptionToUser = asyncHandler(async (req, res) => {
  const { userId, planId, duration } = req.body;

  if (!userId || !planId) {
    throw new ApiError(400, "User ID and Plan ID required");
  }

  const user = await User.findById(userId);
  if (!user) {
    throw new ApiError(404, "User not found");
  }

  const plan = await SubscriptionPlan.findById(planId);
  if (!plan) {
    throw new ApiError(404, "Plan not found");
  }

  const endDate = new Date();
  endDate.setDate(endDate.getDate() + (duration || plan.duration));

  // Check if user already has a subscription
  let subscription = await UserSubscription.findOne({ user: userId });

  if (subscription) {
    // Update existing subscription
    subscription.currentPlan = planId;
    subscription.startDate = new Date();
    subscription.endDate = endDate;
    subscription.status = "active";
    
    // Add to history
    subscription.history.push({
      plan: planId,
      startDate: new Date(),
      endDate: endDate,
      status: "active",
      amount: 0, // Manual assignment
    });
    
    await subscription.save();
  } else {
    // Create new subscription
    subscription = await UserSubscription.create({
      user: userId,
      currentPlan: planId,
      startDate: new Date(),
      endDate: endDate,
      status: "active",
      history: [{
        plan: planId,
        startDate: new Date(),
        endDate: endDate,
        status: "active",
        amount: 0,
      }]
    });
  }

  // Update user's subscription reference
  user.subscription = subscription._id;
  user.currentPlan = planId;
  await user.save();

  return res.status(200).json(
    new ApiResponse(200, subscription, "Subscription assigned successfully")
  );
});

// Cancel user subscription (Admin)
export const cancelUserSubscription = asyncHandler(async (req, res) => {
  const { userId } = req.params;

  const subscription = await UserSubscription.findOne({ user: userId });
  if (!subscription) {
    throw new ApiError(404, "Subscription not found");
  }

  subscription.status = "cancelled";
  subscription.autoRenew = false;
  await subscription.save();

  return res.status(200).json(
    new ApiResponse(200, subscription, "Subscription cancelled successfully")
  );
});

// ==================== FEATURE MANAGEMENT ====================

// Get all features (Admin)
export const getAllFeatures = asyncHandler(async (req, res) => {
  const features = await Feature.find().sort({ category: 1, displayOrder: 1 });
  
  return res.status(200).json(
    new ApiResponse(200, features, "Features fetched successfully")
  );
});

// Create feature (Admin)
export const createFeature = asyncHandler(async (req, res) => {
  const { name, displayName, description, category, icon } = req.body;

  if (!name || !displayName || !category) {
    throw new ApiError(400, "Required fields missing");
  }

  const feature = await Feature.create({
    name,
    displayName,
    description,
    category,
    icon
  });

  return res.status(201).json(
    new ApiResponse(201, feature, "Feature created successfully")
  );
});

// Update feature (Admin)
export const updateFeature = asyncHandler(async (req, res) => {
  const { id } = req.params;
  const updateData = req.body;

  const feature = await Feature.findByIdAndUpdate(
    id,
    { $set: updateData },
    { new: true, runValidators: true }
  );

  if (!feature) {
    throw new ApiError(404, "Feature not found");
  }

  return res.status(200).json(
    new ApiResponse(200, feature, "Feature updated successfully")
  );
});

// Delete feature (Admin)
export const deleteFeature = asyncHandler(async (req, res) => {
  const { id } = req.params;

  const feature = await Feature.findByIdAndDelete(id);

  if (!feature) {
    throw new ApiError(404, "Feature not found");
  }

  return res.status(200).json(
    new ApiResponse(200, null, "Feature deleted successfully")
  );
});

// ==================== USER CONTROLLERS ====================


export const checkWishlistLimit = asyncHandler(async (req, res) => {
  const userId = req.user._id;

  const subscription = await UserSubscription.findOne({ user: userId })
    .populate("currentPlan");

  if (!subscription) {
    return res.status(200).json(
      new ApiResponse(200, {
        allowed: false,
        maxWishlistItems: 10,  // default free plan
      }, "No subscription found")
    );
  }

  const maxItems = subscription.currentPlan?.features?.maxWishlistItems ?? 10;

  return res.status(200).json(
    new ApiResponse(200, {
      allowed: true,
      maxWishlistItems: maxItems,
    }, "Wishlist limit fetched")
  );
});

// Get all active plans (Public/User)
export const getActivePlans = asyncHandler(async (req, res) => {
  const plans = await SubscriptionPlan.find({ isActive: true })
    .sort({ displayOrder: 1 })
    .select("-razorpayPlanId");
  
  return res.status(200).json(
    new ApiResponse(200, plans, "Active plans fetched successfully")
  );
});

export const checkCartLimit = asyncHandler(async (req, res) => {
  const userId = req.user._id;

  const subscription = await UserSubscription.findOne({ user: userId })
    .populate("currentPlan");

  if (!subscription) {
    return res.status(200).json(
      new ApiResponse(200, {
        allowed: false,
        maxCartItems: 5,  // free plan limit
      }, "No subscription found")
    );
  }

  const maxItems = subscription.currentPlan?.features?.maxCartItems ?? 5;

  return res.status(200).json(
    new ApiResponse(200, {
      allowed: true,
      maxCartItems: maxItems,
    }, "Cart limit fetched")
  );
});


// Get my subscription (User)
export const getMySubscription = asyncHandler(async (req, res) => {
  const userId = req.user._id;

  const subscription = await UserSubscription.findOne({ user: userId })
    .populate("currentPlan");

  if (!subscription) {
    return res.status(200).json(
      new ApiResponse(200, null, "No active subscription")
    );
  }

  return res.status(200).json(
    new ApiResponse(200, subscription, "Subscription fetched successfully")
  );
});

// Subscribe to plan (User)
export const subscribeToPlan = asyncHandler(async (req, res) => {
  const { planId, paymentId, razorpayOrderId, razorpaySignature } = req.body;
  const userId = req.user._id;

  if (!planId) {
    throw new ApiError(400, "Plan ID required");
  }

  const plan = await SubscriptionPlan.findById(planId);
  if (!plan || !plan.isActive) {
    throw new ApiError(404, "Plan not found or inactive");
  }

  // TODO: Verify Razorpay payment here

  const endDate = new Date();
  endDate.setDate(endDate.getDate() + plan.duration);

  let subscription = await UserSubscription.findOne({ user: userId });

  if (subscription) {
    // Upgrade/downgrade existing subscription
    subscription.currentPlan = planId;
    subscription.startDate = new Date();
    subscription.endDate = endDate;
    subscription.status = "active";
    subscription.lastPaymentId = paymentId;
    subscription.lastPaymentAmount = plan.price;
    subscription.lastPaymentDate = new Date();
    
    subscription.history.push({
      plan: planId,
      startDate: new Date(),
      endDate: endDate,
      amount: plan.price,
      paymentId,
      status: "active",
    });
    
    await subscription.save();
  } else {
    // New subscription
    subscription = await UserSubscription.create({
      user: userId,
      currentPlan: planId,
      startDate: new Date(),
      endDate: endDate,
      status: "active",
      lastPaymentId: paymentId,
      lastPaymentAmount: plan.price,
      lastPaymentDate: new Date(),
      history: [{
        plan: planId,
        startDate: new Date(),
        endDate: endDate,
        amount: plan.price,
        paymentId,
        status: "active",
      }]
    });
  }

  // Update user
  const user = await User.findById(userId);
  user.subscription = subscription._id;
  user.currentPlan = planId;
  await user.save();

  return res.status(200).json(
    new ApiResponse(200, subscription, "Subscription activated successfully")
  );
});

export const updateUsage = asyncHandler(async (req, res) => {
  const userId = req.user._id;
  const { cartCount, wishlistCount, ordersCount } = req.body;

  const sub = await UserSubscription.findOne({ user: userId, status: "active" });

  if (!sub) {
    return res.status(200).json(
      new ApiResponse(200, null, "No active subscription")
    );
  }

  // Update only provided values
  if (typeof cartCount === "number") {
    sub.usage.cartItemsUsed = cartCount;
  }

  if (typeof wishlistCount === "number") {
    sub.usage.wishlistItemsUsed = wishlistCount;
  }

  if (typeof ordersCount === "number") {
    sub.usage.ordersThisMonth = ordersCount;
  }

  await sub.save();

  return res.status(200).json(
    new ApiResponse(200, sub.usage, "Usage updated successfully")
  );
});
