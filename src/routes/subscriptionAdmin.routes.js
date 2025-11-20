// ============================================
// 📁 routes/subscription.routes.js
// ============================================

import { Router } from "express";
import { verifyJWT, isAdmin } from "../middleware/auth.middleware.js";
import {
  // Admin - Plans
  getAllPlans,
  createPlan,
  updatePlan,
  deletePlan,
  togglePlanStatus,
  setDefaultPlan,
  
  // Admin - User Subscriptions
  getAllUserSubscriptions,
  assignSubscriptionToUser,
  cancelUserSubscription,
  
  // Admin - Features
  getAllFeatures,
  createFeature,
  updateFeature,
  deleteFeature,
  
  // User - Public
  getActivePlans,
  getMySubscription,
  subscribeToPlan,
} from "../controllers/subscription.controller.js";

const router = Router();

// ==================== ADMIN ROUTES ====================

// Plans Management
router.get("/plans", verifyJWT, isAdmin, getAllPlans);
router.post("/plans", verifyJWT, isAdmin, createPlan);
router.put("/plans/:id", verifyJWT, isAdmin, updatePlan);
router.delete("/plans/:id", verifyJWT, isAdmin, deletePlan);
router.patch("/:id/toggle", verifyJWT, isAdmin, togglePlanStatus);
router.patch("/plans/:id/set-default", verifyJWT, isAdmin, setDefaultPlan);

// User Subscriptions Management
router.get("/user-subscriptions", verifyJWT, isAdmin, getAllUserSubscriptions);
router.post("/assign-subscription", verifyJWT, isAdmin, assignSubscriptionToUser);
router.patch("/cancel-subscription/:userId", verifyJWT, isAdmin, cancelUserSubscription);

// Features Management
router.get("/features", verifyJWT, isAdmin, getAllFeatures);
router.post("/features", verifyJWT, isAdmin, createFeature);
router.put("/features/:id", verifyJWT, isAdmin, updateFeature);
router.delete("/features/:id", verifyJWT, isAdmin, deleteFeature);

// ==================== USER ROUTES ====================

// Public routes
router.get("/plans", getActivePlans); // Public - no auth needed

// Protected routes
router.get("/my-subscription", verifyJWT, getMySubscription);
router.post("/subscribe", verifyJWT, subscribeToPlan);

export default router;