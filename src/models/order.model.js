import mongoose from "mongoose";

const orderSchema = new mongoose.Schema(
  {
    user: { 
      type: mongoose.Schema.Types.ObjectId, 
      ref: "User", 
      required: true 
    },

    orderNumber: {
      type: String,
      required: true,
      unique: true,     // <-- unique already creates index
    },

    orderItems: [
      {
        product: { 
          type: mongoose.Schema.Types.ObjectId, 
          ref: "Product", 
          required: true 
        },
        quantity: { type: Number, required: true },
        price: { type: Number, required: true },

        // Extra Trackers
        color: String,
        size: String,
        productName: String,
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

      landmark: String,
      addressType: { 
        type: String, 
        enum: ["home", "office", "other"], 
        default: "home" 
      },
    },

    // Pricing
    subtotal: { type: Number, required: true },
    shippingCost: { type: Number, default: 0 },
    tax: { type: Number, default: 0 },
    discount: { type: Number, default: 0 },
    totalAmount: { type: Number, required: true },

    // Coupon
    couponCode: String,
    couponDiscount: Number,

    // Payment
    paymentMethod: { 
      type: String, 
      enum: ["COD", "ONLINE"], 
      default: "COD" 
    },

    paymentStatus: {
      type: String,
      enum: ["Pending", "Paid", "Failed", "Refund Initiated", "Refunded"],
      default: "Pending",
    },

    // Razorpay
    razorpayOrderId: String,
    paymentId: String,
    razorpaySignature: String,

    // Order Status
    orderStatus: {
      type: String,
      enum: [
        "Processing",
        "Confirmed",
        "Packed",
        "Shipped",
        "Out for Delivery",
        "Delivered",
        "Cancelled",
        "Returned",
      ],
      default: "Processing",
    },

    // Status History
    statusHistory: [
      {
        status: String,
        timestamp: { type: Date, default: Date.now },
        note: String,
        updatedBy: { type: mongoose.Schema.Types.ObjectId, ref: "User" },
      },
    ],

    // Tracking
    trackingNumber: { type: String }, // DON'T index manually (no need)
    trackingUrl: String,
    courier: String,
    estimatedDelivery: Date,
    deliveredAt: Date,

    // Refund
    refundId: String,
    refundStatus: String,
    refundAmount: Number,
    refundReason: String,

    // Cancellation
    cancellationReason: String,
    cancelledBy: { type: mongoose.Schema.Types.ObjectId, ref: "User" },
    cancelledAt: Date,

    // Notes
    note: String,
    adminNote: String,

    // Invoice
    invoiceNumber: String,
    invoiceUrl: String,
  },
  { timestamps: true }
);

// ----------------------------------------------------
// ✅ SAFE INDEXES (No duplicates)
// ----------------------------------------------------
orderSchema.index({ user: 1, createdAt: -1 });
orderSchema.index({ orderStatus: 1 });
orderSchema.index({ paymentStatus: 1 });


// ----------------------------------------------------
// Pre-save hook for status history
// ----------------------------------------------------
orderSchema.pre("save", function (next) {
  if (this.isModified("orderStatus")) {
    this.statusHistory.push({
      status: this.orderStatus,
      timestamp: new Date(),
    });
  }
  next();
});

export default mongoose.models.Order || mongoose.model("Order", orderSchema);
