import crypto from "crypto";
import { asyncHandler } from "../utils/asyncHandler.js";
import { ApiResponse } from "../utils/ApiResponse.js";
import { ApiError } from "../utils/ApiError.js";
import { razorpayInstance } from "../utils/razorpay.js";
import { generateOrderNumber } from "../utils/generateOrderNumber.js";
import User  from "../models/user.model.js";
import  Product  from "../models/product.model.js";
import Cart  from "../models/cart.model.js";
import Order  from "../models/order.model.js";
import { createTransaction } from "./admin.controller.js";

// 🧾 Create Razorpay Order
export const createPaymentOrder = asyncHandler(async (req, res) => {
  const user = req.user;
  if (!user) throw new ApiError(401, "Unauthorized");

  const { amount } = req.body;
  if (!amount) throw new ApiError(400, "Amount is required");

  const options = {
    amount: amount * 100, // paise
    currency: "INR",
  };

  const razorOrder = await razorpayInstance.orders.create(options);

  return res.status(200).json(
    new ApiResponse(200, {
      razorpayOrderId: razorOrder.id,
      currency: razorOrder.currency,
      amount: razorOrder.amount,
    }, "Razorpay order created successfully")
  );
});


// ✅ Verify Payment & Create Order
export const verifyPayment = asyncHandler(async (req, res) => {
  const user = req.user;

  if (!user) throw new ApiError(401, "Unauthorized");

  const {
    isCart,
    razorpay_order_id,
    razorpay_payment_id,
    razorpay_signature,
    productId,
    quantity,
    address,
    note
  } = req.body;

  if (!address) throw new ApiError(400, "Shipping address required");

  // 🔍 Verify Signature
  const body = razorpay_order_id + "|" + razorpay_payment_id;
  const expectedSignature = crypto
    .createHmac("sha256", process.env.RAZORPAY_KEY_SECRET)
    .update(body)
    .digest("hex");

  if (expectedSignature !== razorpay_signature) {
    throw new ApiError(400, "Invalid payment signature");
  }

  let orderItems = [];
  let totalAmount = 0;

  // 🛒 Cart Order
  if (isCart) {
    const cart = await Cart.findOne({ user: user._id }).populate("items.product", "name price stock");
    if (!cart || !cart.items.length) throw new ApiError(400, "Cart is empty");

    for (const item of cart.items) {
      const { product, quantity } = item;
      if (product.stock < quantity)
        throw new ApiError(400, `Insufficient stock for ${product.name}`);

      totalAmount += product.price * quantity;
      orderItems.push({ product: product._id, quantity, price: product.price });
      await Product.findByIdAndUpdate(product._id, { $inc: { stock: -quantity } });
    }

    await Cart.deleteOne({ user: user._id });
  } 
  // 🧺 Single Product Order
  else {
    const product = await Product.findById(productId);
    if (!product) throw new ApiError(404, "Product not found");
    if (product.stock < quantity) throw new ApiError(400, "Insufficient stock");

    totalAmount = product.price * quantity;
    orderItems.push({ product: product._id, quantity, price: product.price });
    await Product.findByIdAndUpdate(product._id, { $inc: { stock: -quantity } });
  }

  // 🧾 Create new order
  const order = await Order.create({
    user: user._id,
    orderItems,
    shippingAddress: address,
    paymentMethod: "ONLINE",
    paymentStatus: "Paid",
    orderStatus: "Processing",
    totalAmount,
    subtotal:totalAmount,
    note,
    orderNumber: generateOrderNumber(),
    paymentId: razorpay_payment_id,
    razorpayOrderId: razorpay_order_id,
    razorpaySignature: razorpay_signature,
  });
    // ✅ Create transaction
    try {
      await createTransaction(order);
    } catch (error) {
      console.error('Transaction creation failed:', error);
    }

  await order.populate("orderItems.product", "name images price");

  return res.status(200).json(
    new ApiResponse(200, order, "Payment verified & order placed successfully")
  );
});


// 🔁 Refund Payment
export const refundPayment = asyncHandler(async (req, res) => {
  const user = req.user;
  if (!user) throw new ApiError(401, "Unauthorized");

  const { orderId, paymentId, amount } = req.body;
  if (!orderId || !paymentId || !amount)
    throw new ApiError(400, "Missing refund fields");

  const order = await Order.findById(orderId);
  if (!order) throw new ApiError(404, "Order not found");
  if (order.user.toString() !== user._id.toString())
    throw new ApiError(403, "Access denied");

  const refund = await razorpayInstance.payments.refund(paymentId, {
    amount: amount * 100,
    speed: "optimum",
  });

  order.orderStatus = "Cancelled";
  order.paymentStatus = "Refunded";
  await order.save();

  return res.status(200).json(
    new ApiResponse(200, { refund }, "Refund initiated successfully")
  );
});
