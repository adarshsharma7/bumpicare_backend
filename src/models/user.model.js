import mongoose from "mongoose";

const addressSchema = new mongoose.Schema(
  {
    fullName: { type: String, required: true },
    phone: { type: String, required: true },
    pincode: { type: String, required: true },
    city: { type: String, required: true },
    state: { type: String, required: true },
    country: { type: String, required: true },
    addressLine: { type: String, required: true },
    selected: { type: Boolean, default: false },
  },
  { _id: true } // ✅ ensures each address gets its own _id
);

const userSchema = new mongoose.Schema(

  {
    name: { type: String, required: true },
    phone: { type: String, required: true },
    email: { type: String, required: true, unique: true },
    password: { type: String, required: true },
    role: { type: String, enum: ["user", "admin"], default: "user" },
    avatar: { type: String, default: "" },

    // Addresses
    address: [
     addressSchema
    ],

    wishlist: [
      {
        type: mongoose.Schema.Types.ObjectId,
        ref: "Product",
      },
    ],

    cart: [
      {
        product: { type: mongoose.Schema.Types.ObjectId, ref: "Cart" },
        quantity: { type: Number, default: 1 },
      },
    ],

  },
  { timestamps: true }
);

export default mongoose.models.User || mongoose.model("User", userSchema);
