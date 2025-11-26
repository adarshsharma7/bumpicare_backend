// ============================================
// 📁 app.js - Secure Backend Configuration
// ============================================

import express from "express";
import cors from "cors";
import cookieParser from "cookie-parser";
import dotenv from "dotenv";
import rateLimit from "express-rate-limit";

// Environment variables load
dotenv.config({
  path: "./.env",
});

const app = express();

// ============================================
// 🔧 Trust Proxy - Required for Vercel/Heroku/Railway
// ============================================

// ✅ This is CRITICAL for rate limiting behind reverse proxies
app.set('trust proxy', 1); // Trust first proxy (Vercel, Heroku, etc.)

// ============================================
// 📋 Rate Limiting - DoS Protection
// ============================================

const limiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100, // limit each IP to 100 requests per windowMs
  message: {
    success: false,
    message: "Too many requests, please try again later.",
  },
  standardHeaders: true,
  legacyHeaders: false,
  // ✅ Skip failed requests from rate limit count
  skipFailedRequests: false,
  // ✅ Skip successful requests from rate limit count
  skipSuccessfulRequests: false,
});

// ============================================
// 🔒 SECURITY: CORS Configuration
// ============================================

const allowedOrigins = [
  "https://bumpicare-admin.vercel.app",  // ✅ Your admin website
  "http://localhost:3000",               // 🔧 Local development (admin)
  "http://localhost:5173",               // 🔧 Vite dev server
  "http://localhost:5174",                       // 🔧 Alternative Vite port
  "https://maxxkart.com",
];

app.use(cors({
  origin: function (origin, callback) {
    // Allow requests with no origin (mobile apps, Postman, curl, etc.)
    if (!origin) {
      return callback(null, true);
    }

    // Check if origin is in allowed list
    if (allowedOrigins.includes(origin)) {
      callback(null, true);
    } else {
      console.log("❌ Blocked origin:", origin);
      callback(new Error("Not allowed by CORS"));
    }
  },
  credentials: true,
  methods: ["GET", "POST", "PUT", "DELETE", "PATCH"],
  allowedHeaders: ["Content-Type", "Authorization", "X-API-Key"],
}));

// ============================================
// 🛡️ Security Headers Middleware
// ============================================

app.use((req, res, next) => {
  res.setHeader("X-Content-Type-Options", "nosniff");
  res.setHeader("X-Frame-Options", "DENY");
  res.setHeader("X-XSS-Protection", "1; mode=block");
  res.setHeader("Strict-Transport-Security", "max-age=31536000; includeSubDomains");
  next();
});

// ============================================
// ✅ Standard Middlewares
// ============================================

app.use(express.json({ limit: "16kb" }));
app.use(express.urlencoded({ extended: true, limit: "16kb" }));
app.use(express.static("public"));
app.use(cookieParser());

// ============================================
// 🔐 IMPROVED: API Key Middleware for Flutter
// ============================================

const validateApiKey = (req, res, next) => {
  const apiKey = req.headers["x-api-key"];
  const validApiKey = process.env.FLUTTER_API_KEY;

  // ✅ Skip API key check for:
  // 1. Health check route
  // 2. ALL admin routes (they use JWT auth from web)
  // 3. Auth routes (login/register - used by both Flutter & Admin website)
  // 4. Public routes (if any)

  const publicRoutes = [
    "/",
    "/api/admin",
    "/api/auth/login",
    "/api/auth/register"
  ];

  // Check if current path matches any public route
  const isPublicRoute = publicRoutes.some(route =>
    req.path === route || req.path.startsWith(route + "/")
  );

  if (isPublicRoute) {
    console.log(`✅ Skipping API key check for: ${req.path}`);
    return next();
  }

  // If API key is not configured, skip validation (for development)
  if (!validApiKey) {
    console.warn("⚠️ FLUTTER_API_KEY not set in .env - API key validation disabled");
    return next();
  }

  // Check if API key is present and valid for non-admin routes
  if (!apiKey || apiKey !== validApiKey) {
    // Get real IP address (considering proxy)
    const realIP = req.ip || req.headers['x-forwarded-for'] || req.connection.remoteAddress;

    console.log("❌ Invalid API Key attempt");
    console.log("   IP:", realIP);
    console.log("   Path:", req.path);
    console.log("   Origin:", req.headers.origin || "none");
    console.log("   User-Agent:", req.headers["user-agent"]?.substring(0, 50) || "none");

    return res.status(401).json({
      success: false,
      message: "Unauthorized: Invalid or missing API Key",
    });
  }

  console.log(`✅ Valid API key for: ${req.path}`);
  next();
};

// ============================================
// ✅ Import Routes
// ============================================

import userRoutes from "./routes/user.routes.js";
import authRoutes from "./routes/auth.routes.js";
import cartRoutes from "./routes/cart.routes.js";
import categoryRoutes from "./routes/category.routes.js";
import orderRoutes from "./routes/order.routes.js";
import paymentRoutes from "./routes/payment.routes.js";
import productRoutes from "./routes/product.routes.js";
import reviewRoutes from "./routes/review.routes.js";
import wishlistRoutes from "./routes/wishlist.routes.js";
import adminRoutes from "./routes/admin.routes.js";
import subscriptionAdminRoutes from "./routes/subscriptionAdmin.routes.js";
import subscriptionRoutes from "./routes/subscriptionUser.routes.js";
import sellerRoutes from "./routes/seller.route.js";
import stockRoutes from "./routes/stock.routes.js";

// ============================================
// ✅ Health Check Route (Before any middleware)
// ============================================

app.get("/", (req, res) => {
  res.status(200).json({
    success: true,
    message: "Bumpicare API is running 🚀",
    timestamp: new Date().toISOString(),
    environment: process.env.NODE_ENV || "development",
  });
});

// ============================================
// 🔐 Apply Middlewares in Correct Order
// ============================================

// 1. Rate limiting to all API routes
// app.use("/api/", limiter);

// 2. API Key validation (will skip admin routes internally)
app.use(validateApiKey);

// ============================================
// ✅ Mount Routes (Admin routes FIRST)
// ============================================

// Mount admin routes FIRST (these will skip API key check)
app.use("/api/admin", adminRoutes);

// Then mount all other routes (these need API key from Flutter)
app.use("/api/users", userRoutes);
app.use("/api/auth", authRoutes);
app.use("/api/cart", cartRoutes);
app.use("/api/category", categoryRoutes);
app.use("/api/orders", orderRoutes);
app.use("/api/payment", paymentRoutes);
app.use("/api/products", productRoutes);
app.use("/api/reviews", reviewRoutes);
app.use("/api/wishlist", wishlistRoutes);
app.use("/api/admin/subscription", subscriptionAdminRoutes);
app.use("/api/subscription", subscriptionRoutes);
app.use("/api/admin/seller", sellerRoutes);
app.use("/api/admin/products/stocks", stockRoutes);

// ============================================
// ❌ 404 Handler - Route Not Found
// ============================================

app.use((req, res) => {
  res.status(404).json({
    success: false,
    message: "Route not found",
    path: req.path,
  });
});

// ============================================
// 💥 Global Error Handler
// ============================================

app.use((err, req, res, next) => {
  console.error("💥 Error:", err.message);

  // Don't log full stack trace in production
  // if (process.env.NODE_ENV !== "production") {
  //   console.error("Stack:", err.stack);
  // }

  // CORS error
  if (err.message === "Not allowed by CORS") {
    return res.status(403).json({
      success: false,
      message: "Access denied: Origin not allowed",
      origin: req.headers.origin || "unknown",
    });
  }

  // Default error response
  res.status(err.statusCode || 500).json({
    success: false,
    message: err.message || "Internal Server Error",
    ...(process.env.NODE_ENV === "development" && { stack: err.stack }),
  });
});

export default app;