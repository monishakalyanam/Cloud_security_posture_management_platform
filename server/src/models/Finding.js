import mongoose from 'mongoose';

const findingSchema = new mongoose.Schema(
  {
    scan: { type: mongoose.Schema.Types.ObjectId, ref: 'Scan', required: true, index: true },
    user: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    resource: { type: mongoose.Schema.Types.ObjectId, ref: 'Resource', required: true },
    ruleId: { type: String, required: true },
    title: { type: String, required: true },
    description: { type: String, required: true },
    whyItMatters: { type: String, required: true },
    remediation: { type: String, required: true },
    severity: { type: String, enum: ['critical', 'high', 'medium', 'low'], required: true },
    severityRank: { type: Number, required: true }, // 4 = critical ... 1 = low, used for sorting
    resourceId: { type: String, required: true },
    resourceType: { type: String, required: true },
    resourceName: { type: String, required: true },
    evidence: { type: String, required: true },
  },
  {
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
findingSchema.index({ scan: 1, severityRank: -1 });

export const Finding = mongoose.model('Finding', findingSchema);
