import { asyncHandler } from "../utils/asyncHandler.js";
import { ApiError } from "../utils/ApiError.js";
import { ApiResponse } from "../utils/ApiResponse.js";
import User from "../models/user.model.js";

// 🧠 Get current logged-in user details
export const getCurrentUser = asyncHandler(async (req, res) => {
  const authUser = req.user;

  if (!authUser) {
    throw new ApiError(401, "Unauthorized");
  }

  const user = await User.findById(authUser._id).select(
    "name phone email address wishlist cart "
  );

  if (!user) {
    throw new ApiError(404, "User not found");
  }

  return res
    .status(200)
    .json(new ApiResponse(200, user, "User fetched successfully"));
});


// 🏡 GET — Get all saved addresses of the user
export const getUserAddress = asyncHandler(async (req, res) => {
  const authUser = req.user;
  if (!authUser) throw new ApiError(401, "Unauthorized");

  const user = await User.findById(authUser._id).select("address");
  if (!user) throw new ApiError(404, "User not found");

  return res
    .status(200)
    .json(new ApiResponse(200, user.address, "User addresses fetched successfully"));
});


// 🏡 POST — Add a new address
export const addUserAddress = asyncHandler(async (req, res) => {
  const authUser = req.user;
  if (!authUser) throw new ApiError(401, "Unauthorized");

  const newAddress = req.body;
 
  if (!newAddress || Object.keys(newAddress).length === 0)
    throw new ApiError(400, "Address data required");

  const user = await User.findById(authUser._id);
  if (!user) throw new ApiError(404, "User not found");

  const isDuplicate = user.address.some(
    (addr) =>
      addr.addressLine.trim().toLowerCase() ===
      newAddress.addressLine.trim().toLowerCase()
  );

  if (isDuplicate) {
 
    return res
      .status(200)
      .json(new ApiResponse(200,user.address, "Address already saved"));
  }

  user.address.push(newAddress);
  await user.save();

  return res
    .status(201)
    .json(new ApiResponse(201, user.address, "Address added successfully"));
});

// 🏡 PATCH — Select address
export const selectUserAddress = asyncHandler(async (req, res) => {
  const authUser = req.user;
  const addressId = req.params.id;

  if (!authUser) throw new ApiError(401, "Unauthorized");
  if (!addressId) throw new ApiError(400, "Address ID is required");

  const user = await User.findById(authUser._id);
  if (!user) throw new ApiError(404, "User not found");

  user.address.forEach((a) => (a.selected = false)); // unselect all
  const selectedAddress = user.address.id(addressId);
  if (!selectedAddress) throw new ApiError(404, "Address not found");

  selectedAddress.selected = true;
  await user.save();

  return res
    .status(200)
    .json(new ApiResponse(200, user.address, "Address selected successfully"));
});


// 🏡 PUT — Update address by ID
export const updateUserAddress = asyncHandler(async (req, res) => {
  const authUser = req.user;
  if (!authUser) throw new ApiError(401, "Unauthorized");

  const addressId = req.params.id;
  const updatedData = req.body;
  if (!addressId) throw new ApiError(400, "Address ID is required");

  const user = await User.findById(authUser._id);
  if (!user) throw new ApiError(404, "User not found");

  const address = user.address.id(addressId); // mongoose subdocument find
  if (!address) throw new ApiError(404, "Address not found");

  Object.assign(address, updatedData);
  await user.save();

  return res
    .status(200)
    .json(new ApiResponse(200, user.address, "Address updated successfully"));
});


// 🏡 DELETE — Remove address by ID
export const deleteUserAddress = asyncHandler(async (req, res) => {
  const authUser = req.user;
  if (!authUser) throw new ApiError(401, "Unauthorized");

  const addressId = req.params.id;
  if (!addressId) throw new ApiError(400, "Address ID is required");

  const user = await User.findById(authUser._id);
  if (!user) throw new ApiError(404, "User not found");

  const address = user.address.id(addressId);
  if (!address) throw new ApiError(404, "Address not found");

  address.deleteOne();
  await user.save();

  return res
    .status(200)
    .json(new ApiResponse(200, user.address, "Address deleted successfully"));
});
