import express from "express";
import cors from "cors";
import cookieParser from "cookie-parser";
import dotenv from "dotenv";

// Environment variables load
dotenv.config({
path: "./.env",
});

const app = express();

// ✅ Middlewares
app.use(cors({
origin: process.env.CORS_ORIGIN || "*", // Flutter se request allow karega
credentials: true,
}));

app.use(express.json({ limit: "16kb" }));
app.use(express.urlencoded({ extended: true, limit: "16kb" }));
app.use(express.static("public"));
app.use(cookieParser());

// ✅ Import Routes (All feature modules)
import userRoutes from "./routes/user.routes.js";
import authRoutes from "./routes/auth.routes.js";
import cartRoutes from "./routes/cart.routes.js";
import categoryRoutes from "./routes/category.routes.js";
import orderRoutes from "./routes/order.routes.js";
import paymentRoutes from "./routes/payment.routes.js";
import productRoutes from "./routes/product.routes.js";
import reviewRoutes from "./routes/review.routes.js";
// import addressRoutes from "./routes/address.routes.js";
import wishlistRoutes from "./routes/wishlist.routes.js";
import adminRoutes  from "./routes/admin.routes.js";

// ✅ Mount all routes under /api
app.use("/api/admin", adminRoutes);
app.use("/api/users", userRoutes);
app.use("/api/auth", authRoutes);
app.use("/api/cart", cartRoutes);
app.use("/api/category", categoryRoutes);
app.use("/api/orders", orderRoutes);
app.use("/api/payment", paymentRoutes);
app.use("/api/products", productRoutes);
app.use("/api/reviews", reviewRoutes);
// app.use("/api/address", addressRoutes);
app.use("/api/wishlist", wishlistRoutes);

// ✅ Default route check
app.get("/", (req, res) => {
res.status(200).json({ message: "Bumpicare API is running 🚀" });
});

// // ✅ Global error handler (optional, best practice)
// app.use((err, req, res, next) => {
//   console.error("💥 Error:", err.message);
//   res.status(err.statusCode || 500).json({
//     success: false,
//     message: err.message || "Internal Server Error",
//   });
// });

export default app;