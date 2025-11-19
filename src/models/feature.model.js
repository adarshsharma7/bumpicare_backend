
// ============================================
// 📁 models/feature.model.js
// ============================================

import mongoose from "mongoose";

const featureSchema = new mongoose.Schema(
  {
    name: { 
      type: String, 
      required: true, 
      unique: true,
      trim: true 
    },
    displayName: { 
      type: String, 
      required: true 
    },
    description: { 
      type: String, 
      default: "" 
    },
    category: { 
      type: String, 
      enum: [
        "cart",
        "orders", 
        "products", 
        "search", 
        "shipping", 
        "support", 
        "analytics", 
        "api"
      ],
      required: true 
    },
    icon: { 
      type: String, 
      default: "CheckCircle" 
    },
    isGlobal: { 
      type: Boolean, 
      default: false 
    }, // Available to all users regardless of plan
    isActive: { 
      type: Boolean, 
      default: true 
    },
    displayOrder: { 
      type: Number, 
      default: 0 
    },
  },
  { timestamps: true }
);

export default mongoose.models.Feature || 
  mongoose.model("Feature", featureSchema);