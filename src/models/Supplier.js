import mongoose from "mongoose";

const supplierSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: true,
      trim: true,
    },
    email: {
      type: String,
      required: true,
      unique: true,
      lowercase: true,
      trim: true,
    },
    phone: {
      type: String,
      required: true,
      trim: true,
    },
    address: {
      street: String,
      city: String,
      state: String,
      country: String,
      zipCode: String,
    },
    contactPerson: {
      name: String,
      email: String,
      phone: String,
    },
    products: [{
      type: mongoose.Schema.Types.ObjectId,
      ref: "Product",
    }],
    rating: {
      type: Number,
      min: 0,
      max: 5,
      default: 0,
    },
    isActive: {
      type: Boolean,
      default: true,
    },
    paymentTerms: {
      type: String,
      default: '',
    },
    deliveryTime: {
      type: String,
      default: '',
    },
    notes: {
      type: String,
      default: '',
    },
  },
  { 
    timestamps: true 
  }
);

// Index for better search performance
supplierSchema.index({ name: 1 });
supplierSchema.index({ isActive: 1 });

export default mongoose.models.Supplier ||
  mongoose.model("Supplier", supplierSchema);