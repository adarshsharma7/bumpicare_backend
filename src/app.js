// ============================================
// 📁 app.js - Secure Backend Configuration
// ============================================

import express from "express";
import cors from "cors";
import cookieParser from "cookie-parser";
import dotenv from "dotenv";

// Environment variables load
dotenv.config({
  path: "./.env",
});

const app = express();

// ============================================
// 🔒 SECURITY: CORS Configuration
// ============================================

const allowedOrigins = [
  "https://bumpicare-admin.vercel.app",  // ✅ Your admin website
  "http://localhost:3000",               // 🔧 Local development (admin)
  "http://localhost:5173",               // 🔧 Vite dev server
  "capacitor://localhost",               // 📱 Capacitor apps
  "http://localhost",                    // 📱 Capacitor Android
];

// Dynamic CORS based on origin
app.use(cors({
  origin: function (origin, callback) {
    // Allow requests with no origin (mobile apps, Postman, etc.)
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
// 🔑 SECURITY: API Key Middleware for Flutter
// ============================================

const validateApiKey = (req, res, next) => {
  const apiKey = req.headers["x-api-key"];
  const validApiKey = process.env.FLUTTER_API_KEY;

  // Skip API key check for admin routes (they use JWT auth)
  if (req.path.startsWith("/api/admin")) {
    return next();
  }

  // Check if API key is present and valid
  if (!apiKey || apiKey !== validApiKey) {
    console.log("❌ Invalid API Key attempt from:", req.ip);
    return res.status(401).json({
      success: false,
      message: "Unauthorized: Invalid API Key",
    });
  }

  next();
};

// ============================================
// 🛡️ Security Headers Middleware
// ============================================

app.use((req, res, next) => {
  // Security headers
  res.setHeader("X-Content-Type-Options", "nosniff");
  res.setHeader("X-Frame-Options", "DENY");
  res.setHeader("X-XSS-Protection", "1; mode=block");
  res.setHeader("Strict-Transport-Security", "max-age=31536000; includeSubDomains");
  
  next();
});

// ============================================
// 📋 Rate Limiting (Optional but recommended)
// ============================================

import rateLimit from "express-rate-limit";

const limiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100, // limit each IP to 100 requests per windowMs
  message: {
    success: false,
    message: "Too many requests, please try again later.",
  },
});

app.use("/api/", limiter);

// ============================================
// ✅ Standard Middlewares
// ============================================

app.use(express.json({ limit: "16kb" }));
app.use(express.urlencoded({ extended: true, limit: "16kb" }));
app.use(express.static("public"));
app.use(cookieParser());

// ============================================
// 🔐 Apply API Key validation to all routes
// ============================================

app.use(validateApiKey);

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

// ============================================
// ✅ Mount Routes
// ============================================

app.use("/api/admin", adminRoutes);
app.use("/api/users", userRoutes);
app.use("/api/auth", authRoutes);
app.use("/api/cart", cartRoutes);
app.use("/api/category", categoryRoutes);
app.use("/api/orders", orderRoutes);
app.use("/api/payment", paymentRoutes);
app.use("/api/products", productRoutes);
app.use("/api/reviews", reviewRoutes);
app.use("/api/wishlist", wishlistRoutes);

// ============================================
// ✅ Health Check Route (No API key needed)
// ============================================

app.get("/", (req, res) => {
  res.status(200).json({
    message: "Bumpicare API is running 🚀",
    timestamp: new Date().toISOString(),
  });
});

// ============================================
// ❌ 404 Handler
// ============================================

app.use((req, res) => {
  res.status(404).json({
    success: false,
    message: "Route not found",
  });
});

// ============================================
// 💥 Global Error Handler
// ============================================

app.use((err, req, res, next) => {
  console.error("💥 Error:", err.message);
  
  // CORS error
  if (err.message === "Not allowed by CORS") {
    return res.status(403).json({
      success: false,
      message: "Access denied: Origin not allowed",
    });
  }

  res.status(err.statusCode || 500).json({
    success: false,
    message: err.message || "Internal Server Error",
  });
});

export default app;