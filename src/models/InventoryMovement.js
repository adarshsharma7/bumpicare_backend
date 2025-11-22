import mongoose from 'mongoose';

const inventoryMovementSchema = new mongoose.Schema({
  product: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Product',
    required: true
  },
  warehouse: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Warehouse',
    required: true
  },
  movementType: {
    type: String,
    enum: ['in', 'out', 'transfer', 'adjustment', 'return', 'damage'],
    required: true
  },
  quantity: {
    type: Number,
    required: true
  },
  previousStock: {
    type: Number,
    required: true
  },
  newStock: {
    type: Number,
    required: true
  },
  reason: {
    type: String,
    required: true
  },
  referenceType: {
    type: String,
    enum: ['order', 'purchase', 'transfer', 'manual', 'return'],
  },
  referenceId: {
    type: mongoose.Schema.Types.ObjectId,
  },
  performedBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  notes: String,
  cost: Number,
}, { timestamps: true });

export default mongoose.model('InventoryMovement', inventoryMovementSchema);
