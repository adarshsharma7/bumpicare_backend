import mongoose from 'mongoose';

const withdrawalSchema = new mongoose.Schema(
  {
    withdrawalId: {
      type: String,
      required: true,
      unique: true,
    },
    seller: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Seller',
      required: true,
    },
    requestedAmount: {
      type: Number,
      required: true,
      min: 0,
    },
    requestedDate: {
      type: Date,
      default: Date.now,
    },
    paymentMethod: {
      type: String,
      enum: ['Wallet', 'Bank Transfer', 'PayPal', 'UPI', 'Check'],
      default: 'Wallet',
    },
    paymentStatus: {
      type: String,
      enum: ['Pending', 'Approved', 'Rejected', 'Processing', 'Completed'],
      default: 'Pending',
    },
    payoutDate: Date,
    note: String,
    
    // Bank Details (if Bank Transfer)
    bankDetails: {
      accountNumber: String,
      accountName: String,
      bankName: String,
      ifscCode: String,
      branchName: String,
    },
    
    // UPI Details
    upiId: String,
    
    // PayPal
    paypalEmail: String,
    
    // Transaction Details
    transactionId: String,
    transactionProof: String,
    
    // Admin Actions
    processedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
    },
    processedAt: Date,
    rejectionReason: String,
    
    // Status History
    statusHistory: [
      {
        status: String,
        timestamp: { type: Date, default: Date.now },
        note: String,
        updatedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
      },
    ],
  },
  { timestamps: true }
);

// Auto-generate withdrawal ID
withdrawalSchema.pre('save', async function (next) {
  if (!this.withdrawalId) {
    const count = await mongoose.model('Withdrawal').countDocuments();
    this.withdrawalId = `WD${String(count + 1).padStart(5, '0')}`;
  }
  
  // Track status changes
  if (this.isModified('paymentStatus')) {
    this.statusHistory.push({
      status: this.paymentStatus,
      timestamp: new Date(),
    });
  }
  
  next();
});

// Indexes
withdrawalSchema.index({ seller: 1, createdAt: -1 });
withdrawalSchema.index({ paymentStatus: 1 });

export default mongoose.model('Withdrawal', withdrawalSchema);
