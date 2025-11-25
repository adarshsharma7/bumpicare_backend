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
        product: { type: mongoose.Schema.Types.ObjectId, ref: "Product" },
        quantity: Number,
        price: Number,
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
    },

    subtotal: { type: Number, required: true }, // Product price only
    shippingCost: { type: Number, default: 0 }, // Shipping/delivery fee
    totalAmount: { type: Number, required: true },
    
    paymentMethod: { type: String, enum: ["COD", "ONLINE"], default: "COD" },
    paymentStatus: { type: String, enum: ["Pending", "Paid", "Refund Initiated", "Refunded"], default: "Pending" },

    // 🔽 New fields for Razorpay
    razorpayOrderId: { type: String },
    paymentId: { type: String },
    razorpaySignature: { type: String },

    orderStatus: {
      type: String,
      enum: ["Processing", "Shipped", "Delivered", "Cancelled"],
      default: "Processing",
    },
    totalAmount: { type: Number, required: true },
    refundId: String,
    refundStatus: { type: String, default: null },

  },
  { timestamps: true }
);


export default mongoose.models.Order || mongoose.model("Order", orderSchema);
