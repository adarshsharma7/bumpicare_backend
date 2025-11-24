import mongoose from 'mongoose';

const transactionSchema = new mongoose.Schema(
  {
    orderId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Order',
      required: true,
    },
    trackingNumber: {
      type: String,
      required: true,
      unique: true,
    },
    productPrice: {
      type: Number,
      required: true,
    },
    deliveryFee: {
      type: Number,
      default: 0,
    },
    paymentMethod: {
      type: String,
      enum: ['Master Card', 'Visa', 'PayPal', 'COD', 'UPI'],
      default: 'Master Card',
    },
    email: {
      type: String,
      required: true,
    },
    paymentStatus: {
      type: String,
      enum: ['paid', 'pending', 'failed'],
      default: 'paid',
    },
    status: {
      type: String,
      enum: ['Delivered', 'Processing', 'Shipped', 'Cancelled', 'Pending'],
      default: 'Processing',
    },
    date: {
      type: Date,
      default: Date.now,
    },
  },
  { timestamps: true }
);

// Index for faster queries
transactionSchema.index({ trackingNumber: 1 });
transactionSchema.index({ email: 1 });
transactionSchema.index({ date: -1 });
transactionSchema.index({ status: 1 });

export default mongoose.model('Transaction', transactionSchema);