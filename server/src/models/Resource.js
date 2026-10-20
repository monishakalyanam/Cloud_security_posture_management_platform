import mongoose from 'mongoose';

const resourceSchema = new mongoose.Schema(
  {
    scan: { type: mongoose.Schema.Types.ObjectId, ref: 'Scan', required: true, index: true },
    user: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    resourceId: { type: String, required: true },
    type: { type: String, required: true },
    name: { type: String, required: true },
    config: { type: mongoose.Schema.Types.Mixed, required: true }, // the cleaned configuration that was evaluated
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
resourceSchema.index({ scan: 1, type: 1 });

export const Resource = mongoose.model('Resource', resourceSchema);
