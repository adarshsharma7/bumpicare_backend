// ============================================
// 📁 models/user-subscription.model.js
// ============================================

import mongoose from "mongoose";

const subscriptionHistorySchema = new mongoose.Schema({
  plan: { 
    type: mongoose.Schema.Types.ObjectId, 
    ref: "SubscriptionPlan" 
  },
  startDate: Date,
  endDate: Date,
  amount: Number,
  paymentId: String,
  status: { 
    type: String, 
    enum: ["active", "expired", "cancelled"], 
    default: "active" 
  },
}, { _id: true });

const userSubscriptionSchema = new mongoose.Schema(
  {
    user: { 
      type: mongoose.Schema.Types.ObjectId, 
      ref: "User", 
      required: true,
      unique: true 
    },
    
    // Current Subscription
    currentPlan: { 
      type: mongoose.Schema.Types.ObjectId, 
      ref: "SubscriptionPlan",
      required: true 
    },
    
    // Dates
    startDate: { 
      type: Date, 
      required: true,
      default: Date.now 
    },
    endDate: { 
      type: Date, 
      required: true 
    },
    
    // Status
    status: { 
      type: String, 
      enum: ["active", "expired", "cancelled", "trial"], 
      default: "active" 
    },
    
    // Auto-renewal
    autoRenew: { 
      type: Boolean, 
      default: false 
    },
    
    // Payment
    razorpaySubscriptionId: { 
      type: String, 
      default: null 
    },
    lastPaymentId: { 
      type: String, 
      default: null 
    },
    lastPaymentAmount: { 
      type: Number, 
      default: 0 
    },
    lastPaymentDate: Date,
    
    // Usage Tracking
    usage: {
      cartItemsUsed: { type: Number, default: 0 },
      wishlistItemsUsed: { type: Number, default: 0 },
      ordersThisMonth: { type: Number, default: 0 },
      productViewsToday: { type: Number, default: 0 },
      lastResetDate: { type: Date, default: Date.now },
    },
    
    // Trial
    trialEndsAt: Date,
    hadTrial: { type: Boolean, default: false },
    
    // History
    history: [subscriptionHistorySchema],
  },
  { timestamps: true }
);

// Check if subscription is expired
userSubscriptionSchema.methods.isExpired = function() {
  return this.endDate < new Date();
};

// Reset monthly/daily counters
userSubscriptionSchema.methods.resetCounters = async function() {
  const now = new Date();
  const lastReset = this.usage.lastResetDate;
  
  // Reset monthly counters
  if (now.getMonth() !== lastReset.getMonth()) {
    this.usage.ordersThisMonth = 0;
  }
  
  // Reset daily counters
  if (now.toDateString() !== lastReset.toDateString()) {
    this.usage.productViewsToday = 0;
  }
  
  this.usage.lastResetDate = now;
  await this.save();
};

export default mongoose.models.UserSubscription || 
  mongoose.model("UserSubscription", userSubscriptionSchema);