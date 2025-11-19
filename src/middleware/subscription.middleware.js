// ============================================
// 📁 middleware/subscription.middleware.js
// ============================================

import UserSubscription from "../models/user-subscription.model.js";
import SubscriptionPlan from "../models/subscription-plan.model.js";
import asyncHandler from "../utils/asyncHandler.js";
import ApiError from "../utils/ApiError.js";

// ✅ Check if user has active subscription
export const checkSubscription = asyncHandler(async (req, res, next) => {
  const userId = req.user._id;

  const subscription = await UserSubscription.findOne({ user: userId })
    .populate("currentPlan");

  if (!subscription || subscription.status !== "active") {
    throw new ApiError(
      403, 
      "Active subscription required to access this feature"
    );
  }

  // Check if expired
  if (subscription.isExpired()) {
    subscription.status = "expired";
    await subscription.save();
    
    throw new ApiError(
      403, 
      "Your subscription has expired. Please renew to continue."
    );
  }

  // Reset counters if needed
  await subscription.resetCounters();

  // Attach to request
  req.subscription = subscription;
  req.plan = subscription.currentPlan;

  next();
});

// ✅ Check specific feature access
export const checkFeature = (featureName) => {
  return asyncHandler(async (req, res, next) => {
    if (!req.plan) {
      throw new ApiError(403, "No active subscription found");
    }

    const features = req.plan.features;

    if (!features || !features[featureName]) {
      throw new ApiError(
        403,
        `Your plan does not include ${featureName}. Please upgrade.`
      );
    }

    next();
  });
};

// ✅ Check cart item limit
export const checkCartLimit = asyncHandler(async (req, res, next) => {
  const userId = req.user._id;
  
  const subscription = await UserSubscription.findOne({ user: userId })
    .populate("currentPlan");

  if (!subscription || !subscription.currentPlan) {
    // If no subscription, apply default limit (e.g., 5 items)
    req.cartLimit = 5;
    return next();
  }

  const maxCartItems = subscription.currentPlan.features.maxCartItems;
  
  // -1 means unlimited
  if (maxCartItems === -1) {
    req.cartLimit = Infinity;
    return next();
  }

  req.cartLimit = maxCartItems;
  next();
});

// ✅ Check wishlist item limit
export const checkWishlistLimit = asyncHandler(async (req, res, next) => {
  const userId = req.user._id;
  
  const subscription = await UserSubscription.findOne({ user: userId })
    .populate("currentPlan");

  if (!subscription || !subscription.currentPlan) {
    req.wishlistLimit = 10; // Default
    return next();
  }

  const maxWishlistItems = subscription.currentPlan.features.maxWishlistItems;
  
  if (maxWishlistItems === -1) {
    req.wishlistLimit = Infinity;
    return next();
  }

  req.wishlistLimit = maxWishlistItems;
  next();
});

// ✅ Check order limit (monthly)
export const checkOrderLimit = asyncHandler(async (req, res, next) => {
  const userId = req.user._id;
  
  const subscription = await UserSubscription.findOne({ user: userId })
    .populate("currentPlan");

  if (!subscription || !subscription.currentPlan) {
    req.orderLimit = 10; // Default
    return next();
  }

  await subscription.resetCounters();

  const maxOrders = subscription.currentPlan.features.maxOrdersPerMonth;
  const currentOrders = subscription.usage.ordersThisMonth;

  if (maxOrders !== -1 && currentOrders >= maxOrders) {
    throw new ApiError(
      403,
      `You have reached your monthly order limit (${maxOrders}). Please upgrade your plan.`
    );
  }

  req.orderLimit = maxOrders;
  next();
});

// ✅ Check bulk order access
export const checkBulkOrder = asyncHandler(async (req, res, next) => {
  const userId = req.user._id;
  
  const subscription = await UserSubscription.findOne({ user: userId })
    .populate("currentPlan");

  if (!subscription || !subscription.currentPlan) {
    throw new ApiError(403, "Bulk orders require a subscription");
  }

  const canBulkOrder = subscription.currentPlan.features.canBulkOrder;
  const maxBulkItems = subscription.currentPlan.features.maxBulkOrderItems;

  if (!canBulkOrder) {
    throw new ApiError(
      403,
      "Your plan does not support bulk orders. Please upgrade to Pro or Enterprise."
    );
  }

  req.bulkOrderLimit = maxBulkItems;
  next();
});

// ✅ Check advanced search access
export const checkAdvancedSearch = asyncHandler(async (req, res, next) => {
  const userId = req.user._id;
  
  const subscription = await UserSubscription.findOne({ user: userId })
    .populate("currentPlan");

  if (!subscription || !subscription.currentPlan) {
    return res.status(403).json({
      success: false,
      message: "Advanced search requires a Pro or Enterprise plan",
      upgradeRequired: true
    });
  }

  const hasAdvancedSearch = subscription.currentPlan.features.hasAdvancedSearch;

  if (!hasAdvancedSearch) {
    return res.status(403).json({
      success: false,
      message: "Advanced search requires a Pro or Enterprise plan",
      upgradeRequired: true
    });
  }

  next();
});

// ✅ Get user's subscription info (middleware helper)
export const attachSubscriptionInfo = asyncHandler(async (req, res, next) => {
  const userId = req.user._id;
  
  const subscription = await UserSubscription.findOne({ user: userId })
    .populate("currentPlan");

  if (subscription) {
    await subscription.resetCounters();
    req.subscription = subscription;
    req.plan = subscription.currentPlan;
  } else {
    // Get default plan for new users
    const defaultPlan = await SubscriptionPlan.findOne({ isDefault: true });
    req.plan = defaultPlan;
    req.subscription = null;
  }

  next();
});

// ============================================
// 📁 utils/subscriptionHelper.js
// ============================================

import UserSubscription from "../models/user-subscription.model.js";
import SubscriptionPlan from "../models/subscription-plan.model.js";

export class SubscriptionHelper {
  
  // Check if user can add to cart
  static async canAddToCart(userId, currentCartSize) {
    const subscription = await UserSubscription.findOne({ user: userId })
      .populate("currentPlan");

    if (!subscription || !subscription.currentPlan) {
      return { allowed: currentCartSize < 5, limit: 5 }; // Default
    }

    const maxItems = subscription.currentPlan.features.maxCartItems;
    
    if (maxItems === -1) {
      return { allowed: true, limit: -1 }; // Unlimited
    }

    return {
      allowed: currentCartSize < maxItems,
      limit: maxItems,
      current: currentCartSize
    };
  }

  // Check if user can add to wishlist
  static async canAddToWishlist(userId, currentWishlistSize) {
    const subscription = await UserSubscription.findOne({ user: userId })
      .populate("currentPlan");

    if (!subscription || !subscription.currentPlan) {
      return { allowed: currentWishlistSize < 10, limit: 10 };
    }

    const maxItems = subscription.currentPlan.features.maxWishlistItems;
    
    if (maxItems === -1) {
      return { allowed: true, limit: -1 };
    }

    return {
      allowed: currentWishlistSize < maxItems,
      limit: maxItems,
      current: currentWishlistSize
    };
  }

  // Check if user can place order
  static async canPlaceOrder(userId) {
    const subscription = await UserSubscription.findOne({ user: userId })
      .populate("currentPlan");

    if (!subscription || !subscription.currentPlan) {
      return {
        allowed: subscription?.usage.ordersThisMonth < 10,
        limit: 10
      };
    }

    await subscription.resetCounters();

    const maxOrders = subscription.currentPlan.features.maxOrdersPerMonth;
    const currentOrders = subscription.usage.ordersThisMonth;

    if (maxOrders === -1) {
      return { allowed: true, limit: -1 };
    }

    return {
      allowed: currentOrders < maxOrders,
      limit: maxOrders,
      current: currentOrders
    };
  }

  // Increment order counter
  static async incrementOrderCount(userId) {
    const subscription = await UserSubscription.findOne({ user: userId });
    if (subscription) {
      subscription.usage.ordersThisMonth += 1;
      await subscription.save();
    }
  }

  // Get feature limits for user
  static async getFeatureLimits(userId) {
    const subscription = await UserSubscription.findOne({ user: userId })
      .populate("currentPlan");

    if (!subscription || !subscription.currentPlan) {
      // Return default limits
      return {
        maxCartItems: 5,
        maxWishlistItems: 10,
        maxOrdersPerMonth: 10,
        canBulkOrder: false,
        hasAdvancedSearch: false,
        hasAdvancedFilters: false,
        shippingType: "standard"
      };
    }

    return subscription.currentPlan.features;
  }

  // Check if subscription is about to expire (within 7 days)
  static async isExpiringSoon(userId) {
    const subscription = await UserSubscription.findOne({ user: userId });
    
    if (!subscription) return false;

    const now = new Date();
    const daysUntilExpiry = Math.ceil(
      (subscription.endDate - now) / (1000 * 60 * 60 * 24)
    );

    return daysUntilExpiry <= 7 && daysUntilExpiry > 0;
  }

  // Auto-assign default plan to new users
  static async assignDefaultPlan(userId) {
    const defaultPlan = await SubscriptionPlan.findOne({ isDefault: true });
    
    if (!defaultPlan) {
      console.warn("No default plan found");
      return null;
    }

    const endDate = new Date();
    endDate.setDate(endDate.getDate() + defaultPlan.duration);

    const subscription = await UserSubscription.create({
      user: userId,
      currentPlan: defaultPlan._id,
      startDate: new Date(),
      endDate: endDate,
      status: "active",
      history: [{
        plan: defaultPlan._id,
        startDate: new Date(),
        endDate: endDate,
        amount: 0, // Free default plan
        status: "active"
      }]
    });

    return subscription;
  }
}