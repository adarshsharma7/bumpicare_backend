// ============================================
// 📁 models/user.model.js (UPDATED)
// ============================================

import mongoose from "mongoose";

const addressSchema = new mongoose.Schema(
  {
    fullName: { type: String, required: true },
    phone: { type: String, required: true },
    pincode: { type: String, required: true },
    city: { type: String, required: true },
    state: { type: String, required: true },
    country: { type: String, required: true },
    addressLine: { type: String, required: true },
    selected: { type: Boolean, default: false },
  },
  { _id: true }
);

const userSchema = new mongoose.Schema(
  {
    name: { type: String, required: true },
    phone: { type: String, required: true },
    email: { type: String, required: true, unique: true },
    password: { type: String, required: true },
    role: { type: String, enum: ["user", "admin"], default: "user" },
    avatar: { type: String, default: "" },

    // ✅ NEW: Subscription Reference
    subscription: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "UserSubscription",
      default: null
    },

    // ✅ NEW: Quick access to current plan (denormalized for performance)
    currentPlan: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "SubscriptionPlan",
      default: null
    },

    // Addresses
    address: [addressSchema],

    wishlist: [
      {
        type: mongoose.Schema.Types.ObjectId,
        ref: "Product",
      },
    ],

    cart: [
      {
        product: { type: mongoose.Schema.Types.ObjectId, ref: "Cart" },
        quantity: { type: Number, default: 1 },
      },
    ],

    isBlocked: { type: Boolean, default: false },
    // ✅ ADD Email Verification
    emailVerified: { type: Boolean, default: false },
    emailVerificationToken: String,
    emailVerificationExpires: Date,

    // ✅ ADD Password Reset
    passwordResetToken: String,
    passwordResetExpires: Date,

    // ✅ ADD Phone Verification
    phoneVerified: { type: Boolean, default: false },
    phoneVerificationOTP: String,
    phoneVerificationExpires: Date,

    // ✅ ADD Last Login
    lastLogin: Date,
    lastLoginIP: String,

    // ✅ ADD User Preferences
    preferences: {
      language: { type: String, default: 'en' },
      currency: { type: String, default: 'INR' },
      notifications: {
        email: { type: Boolean, default: true },
        sms: { type: Boolean, default: true },
        push: { type: Boolean, default: true },
      },
    },

    // ✅ ADD Referral System
    referralCode: { type: String, unique: true, sparse: true },
    referredBy: { type: mongoose.Schema.Types.ObjectId, ref: "User" },
    referralCount: { type: Number, default: 0 },

    // ✅ ADD Wallet (for refunds, cashback)
    walletBalance: { type: Number, default: 0 },
  },
  { timestamps: true }
);
userSchema.pre('save', async function (next) {
  if (this.isNew && !this.referralCode) {
    this.referralCode = `REF${this._id.toString().slice(-8).toUpperCase()}`;
  }
  next();
});
// ✅ Virtual to check if user has active subscription
userSchema.virtual('hasActiveSubscription').get(function () {
  return this.subscription != null && this.currentPlan != null;
});

// ✅ Method to get subscription features
userSchema.methods.getSubscriptionFeatures = async function () {
  if (!this.currentPlan) return null;

  const SubscriptionPlan = mongoose.model('SubscriptionPlan');
  const plan = await SubscriptionPlan.findById(this.currentPlan);
  return plan?.features || null;
};

// ✅ Method to check if feature is accessible
userSchema.methods.canAccessFeature = async function (featureName) {
  const features = await this.getSubscriptionFeatures();
  if (!features) return false;

  return features[featureName] === true || features[featureName] === -1;
};

export default mongoose.models.User || mongoose.model("User", userSchema);