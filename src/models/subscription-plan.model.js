// ============================================
// 📁 models/subscription-plan.model.js
// ============================================

import mongoose from "mongoose";

const featureLimitSchema = new mongoose.Schema({
  // Cart & Wishlist
  maxCartItems: { type: Number, default: 5 }, // -1 for unlimited
  maxWishlistItems: { type: Number, default: 10 },
  
  // Orders
  maxOrdersPerMonth: { type: Number, default: 10 },
  canBulkOrder: { type: Boolean, default: false },
  maxBulkOrderItems: { type: Number, default: 0 },
  
  // Products
  canViewAllProducts: { type: Boolean, default: true },
  maxProductViews: { type: Number, default: -1 }, // daily limit
  
  // Search & Filters
  hasAdvancedSearch: { type: Boolean, default: false },
  hasAdvancedFilters: { type: Boolean, default: false },
  canSaveSearches: { type: Boolean, default: false },
  
  // Shipping
  shippingType: { 
    type: String, 
    enum: ["standard", "express", "same-day"], 
    default: "standard" 
  },
  freeShippingAbove: { type: Number, default: 999 }, // ₹999+
  
  // Support
  hasPrioritySupport: { type: Boolean, default: false },
  hasDedicatedManager: { type: Boolean, default: false },
  supportResponseTime: { 
    type: String, 
    enum: ["24-48hrs", "12-24hrs", "instant"], 
    default: "24-48hrs" 
  },
  
  // Additional Features
  hasApiAccess: { type: Boolean, default: false },
  canExportData: { type: Boolean, default: false },
  hasAnalyticsDashboard: { type: Boolean, default: false },
  canScheduleOrders: { type: Boolean, default: false },
  hasWhiteLabel: { type: Boolean, default: false },
  
  // Discounts
  maxDiscountPercent: { type: Number, default: 10 },
  canStackCoupons: { type: Boolean, default: false },
  
  // Returns
  returnWindow: { type: Number, default: 7 }, // days
  hasEasyReturns: { type: Boolean, default: false },
}, { _id: false });

const subscriptionPlanSchema = new mongoose.Schema(
  {
    name: { 
      type: String, 
      required: true, 
      unique: true,
      trim: true 
    },
    displayName: { 
      type: String, 
      required: true 
    },
    description: { 
      type: String, 
      required: true 
    },
    tagline: { 
      type: String, 
      default: "" 
    },
    
    // Pricing
    price: { 
      type: Number, 
      required: true,
      min: 0 
    },
    currency: { 
      type: String, 
      default: "INR" 
    },
    duration: { 
      type: Number, 
      required: true, 
      default: 30 
    }, // days
    billingCycle: { 
      type: String, 
      enum: ["monthly", "quarterly", "yearly", "lifetime"], 
      default: "monthly" 
    },
    
    // Features
    features: featureLimitSchema,
    
    // Display
    color: { 
      type: String, 
      default: "#14b8a6" 
    }, // Tailwind color
    icon: { 
      type: String, 
      default: "Package" 
    }, // Lucide icon name
    badge: { 
      type: String, 
      default: null 
    }, // "Popular", "Best Value"
    
    // Status
    isActive: { 
      type: Boolean, 
      default: true 
    },
    isDefault: { 
      type: Boolean, 
      default: false 
    }, // Default plan for new users
    
    // Razorpay
    razorpayPlanId: { 
      type: String, 
      default: null 
    },
    
    // Order
    displayOrder: { 
      type: Number, 
      default: 0 
    },
  },
  { timestamps: true }
);

// Ensure only one default plan
subscriptionPlanSchema.pre('save', async function(next) {
  if (this.isDefault) {
    await this.constructor.updateMany(
      { _id: { $ne: this._id } },
      { $set: { isDefault: false } }
    );
  }
  next();
});

export default mongoose.models.SubscriptionPlan || 
  mongoose.model("SubscriptionPlan", subscriptionPlanSchema);


