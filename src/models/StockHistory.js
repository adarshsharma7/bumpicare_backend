// models/StockHistory.js
import mongoose from "mongoose";

const stockHistorySchema = new mongoose.Schema(
  {
    product: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Product",
      required: true,
    },
    type: {
      type: String,
      enum: ["in", "out", "adjustment", "damage", "return"],
      required: true,
    },
    quantity: {
      type: Number,
      required: true,
    },
    previousStock: {
      type: Number,
      required: true,
    },
    newStock: {
      type: Number,
      required: true,
    },
    warehouse: String,
    orderRequest: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "OrderRequest",
    },
    performedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    reason: String,
    notes: String,
  },
  { 
    timestamps: true 
  }
);

// Index for better performance
stockHistorySchema.index({ product: 1, createdAt: -1 });

export default mongoose.models.StockHistory ||
  mongoose.model("StockHistory", stockHistorySchema);
