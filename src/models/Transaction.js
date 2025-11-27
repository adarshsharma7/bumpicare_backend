import mongoose from 'mongoose';

const transactionSchema = new mongoose.Schema(
  {
    orderId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Order',
      required: true,
    },
    userId: { // ✅ ADD direct user reference
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
    trackingNumber: {
      type: String,
      required: true,
      unique: true,
    },

    // Amounts
    productPrice: { type: Number, required: true },
    deliveryFee: { type: Number, default: 0 },
    tax: { type: Number, default: 0 }, 
    discount: { type: Number, default: 0 }, 
    totalAmount: { type: Number, required: true }, 

    paymentMethod: {
      type: String,
      enum: ['Master Card', 'Visa', 'PayPal', 'COD', 'ONLINE', 'Wallet'], // ✅ ADD Wallet
      default: 'COD',
    },
    email: {
      type: String,
      required: true,
    },

    // ✅ ADD Payment Gateway Details
    paymentGateway: {
      type: String,
      enum: ['razorpay', 'stripe', 'paypal', null],
      default: null,
    },
    gatewayTransactionId: String,
    gatewayResponse: mongoose.Schema.Types.Mixed,

    paymentStatus: {
      type: String,
      enum: ['paid', 'pending', 'failed', 'refunded', 'partially_refunded'],
      default: 'pending',
    },
    status: {
      type: String,
      enum: ['Delivered', 'Processing', 'Shipped', 'Cancelled', 'Pending', 'Returned'],
      default: 'Processing',
    },

    // ✅ ADD Refund Details
    refundAmount: Number,
    refundDate: Date,
    refundReason: String,

    date: {
      type: Date,
      default: Date.now,
    },
  },
  { timestamps: true }
);

// Index for faster queries
// ✅ ADD Indexes
transactionSchema.index({ orderId: 1 });
transactionSchema.index({ userId: 1 });
transactionSchema.index({ paymentStatus: 1 });
transactionSchema.index({ date: -1 });

export default mongoose.model('Transaction', transactionSchema);