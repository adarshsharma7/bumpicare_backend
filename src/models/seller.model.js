import mongoose from "mongoose";

const sellerSchema = new mongoose.Schema(
  {
    // Basic Info
    name: { type: String, required: true },
    email: { type: String, required: true, unique: true },
    phone: { type: String },

    // Store Info
    shopName: { type: String, required: true },
    shopLogo: { type: String },
    shopBanner: { type: String },

    // Address
    address: {
      street: String,
      city: String,
      state: String,
      country: String,
      pincode: String,
    },

    // Business / Legal Info
    gstNumber: { type: String },
    panNumber: { type: String },
    documents: [String], // URLs for uploaded KYC docs

    // Seller Status
    status: {
      type: String,
      enum: ["pending", "approved", "suspended"],
      default: "approved",
    },

    // Ratings (global)
    ratings: { type: Number, default: 0 },
    reviewsCount: { type: Number, default: 0 },

    // Optional
    commissionRate: { type: Number, default: 10 }, // 10% default
    isActive: { type: Boolean, default: true },
  },
  { timestamps: true }
);

export default mongoose.models.Seller ||
  mongoose.model("Seller", sellerSchema);
