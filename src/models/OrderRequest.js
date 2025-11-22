// models/OrderRequest.js
import mongoose from "mongoose";

const orderRequestSchema = new mongoose.Schema(
  {
    product: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Product",
      required: true,
    },
    quantity: {
      type: Number,
      required: true,
      min: 1,
    },
    unit: {
      type: String,
      required: true,
      default: "pcs",
    },
    orderType: {
      type: String,
      enum: ["purchase", "restocking", "emergency"],
      required: true,
    },
    priority: {
      type: String,
      enum: ["low", "medium", "high", "urgent"],
      required: true,
      default: "medium",
    },
    supplier: {
      type: String,
      required: true,
    },
    warehouse: {
      type: String,
      required: true,
    },
    currentStock: {
      type: Number,
      required: true,
    },
    status: {
      type: String,
      enum: ["pending", "approved", "rejected", "completed", "cancelled"],
      default: "pending",
    },
    requestedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    approvedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
    },
    approvedAt: Date,
    completedAt: Date,
    notes: String,
    rejectionReason: String,
  },
  { 
    timestamps: true 
  }
);

// Indexes for better query performance
orderRequestSchema.index({ status: 1, createdAt: -1 });
orderRequestSchema.index({ product: 1, status: 1 });
orderRequestSchema.index({ requestedBy: 1 });

export default mongoose.models.OrderRequest ||
  mongoose.model("OrderRequest", orderRequestSchema);