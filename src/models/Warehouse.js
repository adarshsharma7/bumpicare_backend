import mongoose from "mongoose";

const warehouseSchema = new mongoose.Schema(
  {
    warehouseId: {
      type: String,
      required: true,
      unique: true,
      uppercase: true,
    },
    name: {
      type: String,
      required: true,
    },
    location: {
      address: String,
      city: String,
      state: String,
      country: String,
      zipCode: String,
      coordinates: {
        latitude: Number,
        longitude: Number,
      },
    },
    capacity: {
      type: Number,
      required: true,
    },
    currentUtilization: {
      type: Number,
      default: 0,
    },
    manager: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
    },
    contactNumber: String,
    isActive: {
      type: Boolean,
      default: true,
    },
    operatingHours: {
      open: String,
      close: String,
    },
  },
  { 
    timestamps: true 
  }
);

export default mongoose.models.Warehouse ||
  mongoose.model("Warehouse", warehouseSchema);