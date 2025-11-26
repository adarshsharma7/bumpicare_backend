import mongoose from 'mongoose';

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

const discountSchema = new mongoose.Schema(
  {
    title: String,
    price: Number,
    from: Date,
    to: Date,
  },
  { _id: false }
);

const variantSchema = new mongoose.Schema(
  {
    sku: { type: String, required: true },
    variantType: String, // e.g. Size, Color, Custom
    value: String,
    price: Number,
    stock: Number,
    image: String,
    color: String, // hex if color variant
    visible: { type: Boolean, default: true },
    status: { type: String, default: 'active' }, // active / inactive
  },
  { _id: false }
);

const productSchema = new mongoose.Schema(
  {
    name: { type: String, required: true },
    slug: { type: String, index: true, unique: false },
    description: { type: String },
    price: { type: Number, required: true },
    discountPrice: Number,
    stock: { type: Number, default: 0 },

    category: { type: mongoose.Schema.Types.ObjectId, ref: 'Category' },
    productType: { type: mongoose.Schema.Types.ObjectId, ref: 'ProductType' },

    images: [String],
    coverPhoto: String,
    videos: [String],
    brand: { type: String, default: 'Generic' },

    colors: [String],
    sizes: [String],

    specifications: [specificationSchema],
    keyInfo: [keyInfoSchema],

    sizeGuide: { type: String },
    seller: { type: mongoose.Schema.Types.ObjectId, ref: 'Seller' },

    variants: [variantSchema],
    discounts: [discountSchema],

    tags: [{ type: mongoose.Schema.Types.ObjectId, ref: 'Tag' }],

    ratings: { type: Number, default: 0 },
    reviewsCount: { type: Number, default: 0 },

    isActive: { type: Boolean, default: true },
    isDraft: {
      type: Boolean,
      default: false
    },

    warehouse: {
      type: String,
      default: "WR-001",
    },
    reorderLevel: {
      type: Number,
      default: 10, // When stock reaches this level, trigger reorder
    },
    reorderQuantity: {
      type: Number,
      default: 50, // Default quantity to reorder
    },
    supplier: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Supplier",
    },
    lastOrderDate: Date,
    averageLeadTime: {
      type: Number, // in days
      default: 7,
    },
    // ✅ ADD SEO Fields
    metaTitle: String,
    metaDescription: String,
    metaKeywords: [String],

    // ✅ ADD Better Status Tracking
    publishedAt: Date,
    status: {
      type: String,
      enum: ['draft', 'published', 'archived'],
      default: 'draft'
    },

    // ✅ ADD Weight for shipping calculation
    weight: Number, // in grams
    dimensions: {
      length: Number,
      width: Number,
      height: Number,
      unit: { type: String, default: 'cm' }
    },

    // ✅ ADD Low Stock Alert
    lowStockThreshold: { type: Number, default: 5 },
    notifyOnLowStock: { type: Boolean, default: true },

    // ✅ ADD for Featured Products
    isFeatured: { type: Boolean, default: false },
    featuredOrder: { type: Number, default: 0 },

    // ✅ ADD Return Policy
    returnPolicy: {
      allowed: { type: Boolean, default: true },
      days: { type: Number, default: 7 },
      conditions: String,
    },
  },
  { timestamps: true }
);
// ✅ ADD Indexes for better performance
productSchema.index({ slug: 1 });
productSchema.index({ category: 1, isActive: 1 });
productSchema.index({ price: 1 });
productSchema.index({ stock: 1 });
productSchema.index({ isFeatured: 1, featuredOrder: 1 });
productSchema.index({ createdAt: -1 });

// ✅ ADD Text Search Index
productSchema.index({
  name: 'text',
  description: 'text',
  brand: 'text'
});

export default mongoose.models.Product || mongoose.model('Product', productSchema);
