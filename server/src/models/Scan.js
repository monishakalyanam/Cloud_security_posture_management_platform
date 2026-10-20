import mongoose from 'mongoose';

const count = { type: Number, default: 0 };

const scanSchema = new mongoose.Schema(
  {
    user: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, index: true },
    sourceName: { type: String, required: true, trim: true, maxlength: 100 },
    sourceType: { type: String, enum: ['sample', 'upload'], default: 'upload' },
    status: { type: String, enum: ['running', 'completed'], default: 'running' },
    // Numbers calculated by the rules engine. The dashboard and reports read these.
    summary: {
      totalResources: count,
      resourcesByType: { type: mongoose.Schema.Types.Mixed, default: {} },
      totalChecks: count,
      passedChecks: count,
      failedChecks: count,
      totalFindings: count,
      findingsBySeverity: { critical: count, high: count, medium: count, low: count },
      score: { type: Number, default: null }, // null means "N/A"
    },
  },
  {
    timestamps: true,
    toJSON: {
      versionKey: false,
      transform: (doc, ret) => {
        ret.id = String(ret._id);
        delete ret._id;
        delete ret.user;
        return ret;
      },
    },
  },
);
scanSchema.index({ user: 1, createdAt: -1 });

export const Scan = mongoose.model('Scan', scanSchema);
