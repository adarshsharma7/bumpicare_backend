import mongoose from "mongoose";

const specificationSchema = new mongoose.Schema(
  {
    title: String,
    value: String,
  },
  { _id: false }
);

const keyInfoSchema = new mongoose.Schema(
  {
    title: String,
    value: String,
  },
  { _id: false }
);

const productSchema = new mongoose.Schema(
  {
    name: { type: String, required: true },
    description: { type: String },
    price: { type: Number, required: true },
    discountPrice: Number,
    stock: { type: Number, default: 0 },

    category: { type: mongoose.Schema.Types.ObjectId, ref: "Category" },

    images: [String],
    brand: { type: String, default: "Generic" },

    colors: [String], // e.g. ["#FF0000", "#0000FF"]
    sizes: [String], // e.g. ["S", "M", "L", "XL"]

    specifications: [specificationSchema], // {title: "Shelf Life", value: "24 Month"}
    keyInfo: [keyInfoSchema], // for key information section

    sizeGuide: { type: String }, // optional text for "Size Guide"
    seller: { type: String, default: "Store" }, // or you can store sellerId

    ratings: { type: Number, default: 0 },
    reviewsCount: { type: Number, default: 0 },

    isActive: { type: Boolean, default: true },
  },
  { timestamps: true }
);

export default mongoose.models.Product ||
  mongoose.model("Product", productSchema);
