// models/FlashSale.js
import mongoose from 'mongoose';

const flashSaleSchema = new mongoose.Schema({
  name: {
    type: String,
    required: true
  },
  description: String,
  banner: String,
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
    salePrice: {
      type: Number,
      required: true
    },
    discountPercentage: {
      type: Number,
      required: true
    },
    stockLimit: {
      type: Number, // Limited stock for flash sale
      default: null
    },
    soldCount: {
      type: Number,
      default: 0
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
  priority: {
    type: Number,
    default: 0 // Higher priority shows first
  },
  createdBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  }
}, { timestamps: true });

flashSaleSchema.index({ startDate: 1, endDate: 1, isActive: 1 });

export default mongoose.model('FlashSale', flashSaleSchema);
