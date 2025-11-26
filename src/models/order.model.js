import mongoose from "mongoose";

const orderSchema = new mongoose.Schema(
  {
    user: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
    orderNumber: {
      type: String,
      required: true,
      unique: true,
    },
    orderItems: [
      {
        product: { type: mongoose.Schema.Types.ObjectId, ref: "Product", required: true },
        quantity: { type: Number, required: true },
        price: { type: Number, required: true },
        // ✅ ADD THESE for better tracking
        color: String,
        size: String,
        productName: String, // Store name in case product is deleted
      },
    ],
    shippingAddress: {
      fullName: String,
      phone: String,
      pincode: String,
      city: String,
      state: String,
      country: String,
      addressLine: String,
      // ✅ ADD
      landmark: String,
      addressType: { type: String, enum: ['home', 'office', 'other'], default: 'home' },
    },

    // Pricing
    subtotal: { type: Number, required: true },
    shippingCost: { type: Number, default: 0 },
    tax: { type: Number, default: 0 }, // ✅ ADD for GST
    discount: { type: Number, default: 0 }, // ✅ ADD for coupon discount
    totalAmount: { type: Number, required: true }, // ❌ Remove duplicate!
    
    // ✅ ADD Coupon tracking
    couponCode: String,
    couponDiscount: Number,
    
    // Payment
    paymentMethod: { type: String, enum: ["COD", "ONLINE"], default: "COD" },
    paymentStatus: { 
      type: String, 
      enum: ["Pending", "Paid", "Failed", "Refund Initiated", "Refunded"], 
      default: "Pending" 
    },

    // Razorpay
    razorpayOrderId: { type: String },
    paymentId: { type: String },
    razorpaySignature: { type: String },

    // Order Status
    orderStatus: {
      type: String,
      enum: ["Processing", "Confirmed", "Packed", "Shipped", "Out for Delivery", "Delivered", "Cancelled", "Returned"],
      default: "Processing",
    },
    
    // ✅ ADD Status History for tracking
    statusHistory: [{
      status: String,
      timestamp: { type: Date, default: Date.now },
      note: String,
      updatedBy: { type: mongoose.Schema.Types.ObjectId, ref: "User" }
    }],
    
    // ✅ ADD Tracking Info
    trackingNumber: String,
    trackingUrl: String,
    courier: String,
    estimatedDelivery: Date,
    deliveredAt: Date,
    
    // Refund
    refundId: String,
    refundStatus: String,
    refundAmount: Number,
    refundReason: String,
    
    // ✅ ADD Cancellation Info
    cancellationReason: String,
    cancelledBy: { type: mongoose.Schema.Types.ObjectId, ref: "User" },
    cancelledAt: Date,
    
    // Notes
    note: String,
    adminNote: String, // ✅ ADD for internal notes
    
    // ✅ ADD Invoice
    invoiceNumber: String,
    invoiceUrl: String,
  },
  { timestamps: true }
);

// ✅ ADD Indexes
orderSchema.index({ user: 1, createdAt: -1 });
orderSchema.index({ orderNumber: 1 });
orderSchema.index({ orderStatus: 1 });
orderSchema.index({ paymentStatus: 1 });

// ✅ ADD Pre-save hook to update status history
orderSchema.pre('save', function(next) {
  if (this.isModified('orderStatus')) {
    this.statusHistory.push({
      status: this.orderStatus,
      timestamp: new Date(),
    });
  }
  next();
});

export default mongoose.models.Order || mongoose.model("Order", orderSchema);