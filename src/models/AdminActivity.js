// models/AdminActivity.js
import mongoose from 'mongoose';

const adminActivitySchema = new mongoose.Schema({
  admin: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  action: {
    type: String,
    required: true,
    enum: [
      'create', 'update', 'delete',
      'approve', 'reject', 'block', 'unblock',
      'refund', 'cancel_order', 'update_status'
    ]
  },
  entity: {
    type: String,
    required: true,
    enum: ['product', 'order', 'user', 'category', 'coupon', 'subscription']
  },
  entityId: mongoose.Schema.Types.ObjectId,
  changes: mongoose.Schema.Types.Mixed, // Old and new values
  ipAddress: String,
  userAgent: String
}, { timestamps: true });

adminActivitySchema.index({ admin: 1, createdAt: -1 });
adminActivitySchema.index({ entity: 1, entityId: 1 });

export default mongoose.model('AdminActivity', adminActivitySchema);