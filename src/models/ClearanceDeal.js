// models/ClearanceDeal.js
import mongoose from 'mongoose';

const clearanceDealSchema = new mongoose.Schema({
  name: {
    type: String,
    required: true
  },
  description: String,
  reason: {
    type: String,
    enum: ['season-end', 'overstock', 'discontinued', 'damaged', 'expiring'],
    required: true
  },
  products: [{
    product: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Product',
      required: true
    },
    originalPrice: {
      type: Number,
      required: true
    },
    clearancePrice: {
      type: Number,
      required: true
    },
    discountPercentage: {
      type: Number,
      required: true
    },
    availableStock: {
      type: Number,
      required: true
    },
    soldCount: {
      type: Number,
      default: 0
    },
    condition: {
      type: String,
      enum: ['new', 'like-new', 'good', 'fair'],
      default: 'new'
    }
  }],
  startDate: {
    type: Date,
    required: true
  },
  endDate: {
    type: Date,
    required: true
  },
  isActive: {
    type: Boolean,
    default: true
  },
  isFinalSale: {
    type: Boolean,
    default: true // No returns
  },
  createdBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  }
}, { timestamps: true });

clearanceDealSchema.index({ startDate: 1, endDate: 1, isActive: 1 });

export default mongoose.model('ClearanceDeal', clearanceDealSchema);

