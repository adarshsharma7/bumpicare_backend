// models/FeaturedDeal.js
import mongoose from 'mongoose';

const featuredDealSchema = new mongoose.Schema({
  title: {
    type: String,
    required: true
  },
  description: String,
  dealType: {
    type: String,
    enum: ['product', 'category', 'bundle'],
    required: true
  },
  banner: String,
  
  // For single product deals
  product: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Product'
  },
  
  // For category deals
  category: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Category'
  },
  
  // For bundle deals
  bundleProducts: [{
    product: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Product'
    },
    quantity: {
      type: Number,
      default: 1
    }
  }],
  
  originalPrice: Number,
  dealPrice: {
    type: Number,
    required: true
  },
  discountPercentage: Number,
  
  badge: {
    type: String,
    default: 'Featured Deal'
  },
  
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
  
  displayOrder: {
    type: Number,
    default: 0
  },
  
  viewCount: {
    type: Number,
    default: 0
  },
  
  purchaseCount: {
    type: Number,
    default: 0
  },
  
  createdBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  }
}, { timestamps: true });

featuredDealSchema.index({ startDate: 1, endDate: 1, isActive: 1 });
featuredDealSchema.index({ displayOrder: 1 });

export default mongoose.model('FeaturedDeal', featuredDealSchema);

