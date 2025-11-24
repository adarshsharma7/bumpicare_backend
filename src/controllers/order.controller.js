import { asyncHandler } from "../utils/asyncHandler.js";
import { ApiError } from "../utils/ApiError.js";
import { ApiResponse } from "../utils/ApiResponse.js";
import Cart from "../models/cart.model.js";
import Order from "../models/order.model.js";
import Product from "../models/product.model.js";
import User from "../models/user.model.js";
import Razorpay from "razorpay";
import { generateOrderNumber } from "../utils/generateOrderNumber.js";
import { createTransaction } from "./admin.controller.js";

/* ------------------------------ CREATE ORDER (From Cart) ------------------------------ */
export const createOrder = asyncHandler(async (req, res) => {
  const user = req.user;
  const { shippingAddress, note } = req.body;

  if (!shippingAddress) throw new ApiError(400, "Shipping address required");

  const cart = await Cart.findOne({ user: user._id }).populate({
    path: "items.product",
    select: "name price stock",
  });

  if (!cart || !cart.items.length)
    throw new ApiError(400, "Cart is empty");

  let subtotal = 0;
  const orderItems = [];

  for (const it of cart.items) {
    const prod = await Product.findById(it.product._id).select("price stock name");
    if (!prod) throw new ApiError(404, `Product ${it.product._id} not found`);
    if (prod.stock < it.quantity)
      throw new ApiError(400, `Insufficient stock for ${prod.name}`);

    const price = prod.price;
    subtotal += price * it.quantity;

    orderItems.push({
      product: prod._id,
      quantity: it.quantity,
      price,
    });

    await Product.findByIdAndUpdate(prod._id, { $inc: { stock: -it.quantity } });
  }

  const shippingCost = subtotal > 1000 ? 0 : 50;
  const totalAmount = subtotal + shippingCost;

  const order = await Order.create({
    user: user._id,
    orderNumber: generateOrderNumber(),
    orderItems,
    shippingAddress,
    note,
    paymentMethod: "COD",
    paymentStatus: "Pending",
    orderStatus: "Processing",
    totalAmount,

  });
  await createTransaction(order);

  await Cart.findOneAndDelete({ user: user._id });

  await order.populate({ path: "orderItems.product", select: "name images price" });

  return res
    .status(201)
    .json(new ApiResponse(201, order, "Order placed successfully"));
});
/* ------------------------------ CREATE SINGLE ORDER ------------------------------ */
export const createSingleOrder = asyncHandler(async (req, res) => {
  const user = req.user;
  const { productId, quantity, shippingAddress, note } = req.body;

  // ✅ Field validation
  if (!productId || !quantity || !shippingAddress) {
    return res
      .status(400)
      .json(new ApiResponse(400, null, "Missing required fields"));
  }

  // ✅ Product check
  const product = await Product.findById(productId);
  if (!product) {
    return res.status(404).json(new ApiResponse(404, null, "Product not found"));
  }

  if (product.stock < quantity) {
    return res
      .status(400)
      .json(new ApiResponse(400, null, "Insufficient stock"));
  }

  // ✅ Calculate total
  const totalAmount = product.price * quantity;

  // ✅ Create order
  const order = await Order.create({
    user: user._id,
    orderNumber: generateOrderNumber(),
    orderItems: [
      {
        product: product._id,
        quantity,
        price: product.price,
      },
    ],
    shippingAddress,
    note,
    paymentMethod: "COD",
    paymentStatus: "Pending",
    orderStatus: "Processing",
    totalAmount,

  });
  await createTransaction(order);
  // ✅ Decrease stock
  await Product.findByIdAndUpdate(product._id, { $inc: { stock: -quantity } });

  // ✅ Populate product info in response
  await order.populate({
    path: "orderItems.product",
    select: "name images price",
  });

  return res
    .status(200)
    .json(new ApiResponse(200, order, "Order placed successfully"));
});


/* ------------------------------ GET SINGLE ORDER BY ID ------------------------------ */
// export const getOrderById = asyncHandler(async (req, res) => {
//   const user = req.user;
//   const orderId = req.params.id;

//   const order = await Order.findById(orderId).populate({
//     path: "orderItems.product",
//     select: "name images price",
//   });

//   if (!order) throw new ApiError(404, "Order not found");

//   // only user who owns it or admin can view
//   if (
//     order.user.toString() !== user._id.toString() &&
//     user.role !== "admin"
//   ) {
//     throw new ApiError(403, "Access denied");
//   }

//   return res
//     .status(200)
//     .json(new ApiResponse(200, order, "Order fetched successfully"));
// });


/* ------------------------------ GET ALL ORDERS (Admin) ------------------------------ */
export const getAllOrders = asyncHandler(async (req, res) => {
  const admin = req.user;
  if (admin.role !== "admin") throw new ApiError(401, "Unauthorized");

  const orders = await Order.find()
    .sort({ placedAt: -1 })
    .populate({ path: "user", select: "name email" })
    .populate({ path: "orderItems.product", select: "name images price" });

  return res
    .status(200)
    .json(new ApiResponse(200, orders, "All orders fetched successfully"));
});


/* ------------------------------ GET USER ORDERS ------------------------------ */
export const getUserOrders = asyncHandler(async (req, res) => {

  const user = req.user;

  const orders = await Order.find({ user: user._id })
    .sort({ placedAt: -1 })
    .populate({ path: "orderItems.product", select: "name images price" });

  return res
    .status(200)
    .json(new ApiResponse(200, orders, "User orders fetched successfully"));
});


/* ------------------------------ CANCEL ORDER ------------------------------ */
export const cancelOrder = asyncHandler(async (req, res) => {
  const user = req.user;
  const { orderId } = req.body;

  const order = await Order.findById(orderId);
  if (!order) throw new ApiError(404, "Order not found");

  if (order.user.toString() !== user._id.toString())
    throw new ApiError(403, "Access denied");

  if (["Shipped", "Delivered", "Cancelled"].includes(order.orderStatus))
    throw new ApiError(400, "Order cannot be cancelled now");

  let refundStatus = null;

  if (order.paymentStatus === "Paid" && order.paymentId) {
    try {
      const razorpay = new Razorpay({
        key_id: process.env.RAZORPAY_KEY_ID,
        key_secret: process.env.RAZORPAY_KEY_SECRET,
      });

      const refund = await razorpay.payments.refund(order.paymentId, {
        amount: order.totalAmount * 100,
      });

      refundStatus = "Refund Initiated";
      order.refundId = refund.id;
      order.refundStatus = refundStatus;
      order.paymentStatus = "Refund Initiated";
    } catch (err) {
      console.error("Refund Error:", err);
      refundStatus = "Refund Failed";
      order.refundStatus = refundStatus;
    }
  }

  order.orderStatus = "Cancelled";
  await order.save();

  return res
    .status(200)
    .json(
      new ApiResponse(
        200,
        order,
        refundStatus
          ? `Order cancelled and ${refundStatus.toLowerCase()}`
          : "Order cancelled successfully"
      )
    );
});


/* ------------------------------ UPDATE ORDER STATUS (Admin) ------------------------------ */
export const updateOrderStatus = asyncHandler(async (req, res) => {
  const admin = req.user;
  if (admin.role !== "admin") throw new ApiError(401, "Unauthorized");

  const { status } = req.body;
  const orderId = req.params.id;

  if (!status) throw new ApiError(400, "Order status required");

  const order = await Order.findById(orderId);
  if (!order) throw new ApiError(404, "Order not found");

  // अगर cancel हो रहा है और paid है => stock वापस add करो
  if (status === "Cancelled" && order.paymentStatus === "Paid") {
    for (const it of order.orderItems) {
      await Product.findByIdAndUpdate(it.product, {
        $inc: { stock: it.quantity },
      });
    }
  }

  order.orderStatus = status;
  if (status === "Delivered") order.deliveredAt = new Date();
  await order.save();

  return res
    .status(200)
    .json(new ApiResponse(200, order, "Order status updated successfully"));
});
