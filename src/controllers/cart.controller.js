import { asyncHandler } from "../utils/asyncHandler.js";
import { ApiError } from "../utils/ApiError.js";
import { ApiResponse } from "../utils/ApiResponse.js";
import  Cart  from "../models/cart.model.js";
import User from "../models/user.model.js";
import Product  from "../models/product.model.js";

// 🛒 Add to Cart
export const addToCart = asyncHandler(async (req, res) => {
  const user = req.user;
  const { productId, quantity = 1, color, size } = req.body;

  if (!productId) throw new ApiError(400, "Product ID is required");

  const product = await Product.findById(productId).select("_id price stock");
  if (!product) throw new ApiError(404, "Product not found");

  const dbUser = await User.findById(user._id);

  let cart = await Cart.findOne({ user: user._id });
  if (!cart) {
    cart = await Cart.create({
      user: user._id,
      items: [{ product: product._id, quantity, color, size }],
    });
    dbUser.cart.push(cart._id);
    await dbUser.save();

    return res
      .status(201)
      .json(new ApiResponse(201, cart, "Cart created and product added"));
  }

  // Check if same product with same variant exists
  const index = cart.items.findIndex(
    (i) =>
      i.product.toString() === product._id.toString() &&
      i.color === color &&
      i.size === size
  );

  if (index > -1) {
    cart.items[index].quantity += quantity;
  } else {
    cart.items.push({ product: product._id, quantity, color, size });
  }

  await cart.save();
  await cart.populate({ path: "items.product", select: "name price images stock" });

  return res.status(200).json(new ApiResponse(200, cart, "Cart updated successfully"));
});



// 🛒 Get Cart
export const getCart = asyncHandler(async (req, res) => {
  const user = req.user;

  const cart = await Cart.findOne({ user: user._id }).populate({
    path: "items.product",
    select: "name price images stock",
  });

  return res
    .status(200)
    .json(new ApiResponse(200, cart || { items: [] }, "Cart fetched successfully"));
});


// 🛒 Update Cart Item Quantity
export const updateCart = asyncHandler(async (req, res) => {
  const user = req.user;
  const { productId, quantity } = req.body;

  if (!productId || typeof quantity !== "number")
    throw new ApiError(400, "Invalid payload");

  const product = await Product.findById(productId).select("_id stock");
  if (!product) throw new ApiError(404, "Product not found");

  const cart = await Cart.findOne({ user: user._id });
  if (!cart) throw new ApiError(404, "Cart not found");

  const idx = cart.items.findIndex((i) => i.product.toString() === productId.toString());
  if (idx === -1) throw new ApiError(404, "Product not found in cart");

  cart.items[idx].quantity = Math.max(1, quantity);
  await cart.save();
  await cart.populate({ path: "items.product", select: "name price images stock" });

  return res
    .status(200)
    .json(new ApiResponse(200, cart, "Cart item updated successfully"));
});


// 🛒 Remove Item from Cart
export const removeFromCart = asyncHandler(async (req, res) => {
  const user = req.user;
  const { productId } = req.body;

  if (!productId) throw new ApiError(400, "Product ID is required");

  let cart = await Cart.findOne({ user: user._id });
  const dbUser = await User.findById(user._id);

  if (!cart) {
    return res
      .status(200)
      .json(new ApiResponse(200, { items: [] }, "Cart is already empty"));
  }

  // filter out the product
  cart.items = cart.items.filter((i) => i.product.toString() !== productId.toString());
  dbUser.cart = cart.items.filter((i) => i.product.toString() !== productId.toString());
  await cart.save();
  await dbUser.save();

  // remove cart reference from user if empty
  if (cart.items.length === 0) {
    await User.findByIdAndUpdate(user._id, { $pull: { cart: cart._id } });
  }

  await cart.populate({ path: "items.product", select: "name price images stock" });

  return res.status(200).json(new ApiResponse(200, cart, "Item removed successfully"));
});
