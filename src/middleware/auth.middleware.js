import jwt from "jsonwebtoken";
import User from "../models/user.model.js";
import { ApiError } from "../utils/ApiError.js";
import { asyncHandler } from "../utils/asyncHandler.js";

// ✅ Verify JWT Token (Existing - Works for both User & Admin)
export const verifyJWT = asyncHandler(async (req, _, next) => {
  try {
    // const authHeader = req.headers.authorization || req.headers.Authorization;

    // if (!authHeader || !authHeader.startsWith("Bearer ")) {
    //   throw new ApiError(401, "No token provided");
    // }

    let token;

    // 1️⃣ From Authorization Header (Flutter, Postman, JS fetch)
    const authHeader = req.headers.authorization || req.headers.Authorization;
    if (authHeader?.startsWith("Bearer ")) {
      token = authHeader.split(" ")[1];
    }

    // 2️⃣ From Cookies (Web browser)
    if (!token && req.cookies?.token) {
      token = req.cookies.token;
    }
    if (!token) {
      throw new ApiError(401, "No token provided");
    }
    // token = authHeader.split(" ")[1];

    // Decode token
    const decoded = jwt.verify(token, process.env.JWT_SECRET_KEY);

    const user = await User.findById(decoded._id).select(
      "-password -refreshToken"
    );

    if (!user) {
      throw new ApiError(401, "Invalid or expired token");
    }

    req.user = user;
    next();
  } catch (error) {
    throw new ApiError(401, error?.message || "Unauthorized");
  }
});

// ✅ Check if User is Admin (NEW - Add this)
export const isAdmin = asyncHandler(async (req, res, next) => {
  try {
    // req.user already set by verifyJWT middleware
    if (!req.user) {
      throw new ApiError(401, "Unauthorized");
    }

    if (req.user.role !== "admin") {
      throw new ApiError(403, "Access denied. Admin privileges required.");
    }

    next();
  } catch (error) {
    throw new ApiError(403, error?.message || "Access denied");
  }
});