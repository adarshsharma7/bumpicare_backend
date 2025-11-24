import mongoose from "mongoose";

const tagSchema = new mongoose.Schema(
  {
    name: { 
      type: String, 
      required: true, 
      unique: true,
      trim: true 
    },
    slug: { 
      type: String, 
      unique: true,
      lowercase: true
    },
    category: {
      type: String,
      default: 'General'
    },
    description: String,
    color: { 
      type: String, 
      default: '#06A096' 
    },
    createdBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User'
    },
    isActive: { 
      type: Boolean, 
      default: true 
    }
  },
  { timestamps: true }
);

// Auto-generate slug from name
tagSchema.pre('save', function(next) {
  if (this.isModified('name') && !this.slug) {
    this.slug = this.name
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-+|-+$/g, '');
  }
  next();
});

export default mongoose.models.Tag || mongoose.model("Tag", tagSchema);