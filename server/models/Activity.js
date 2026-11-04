import mongoose from 'mongoose';
import { ACTIVITY_ACTIONS } from '../utils/constants.js';

/**
 * Append-only audit trail. Nothing in the app updates or removes these
 * documents, which is what makes the "delete with audit history" requirement
 * defensible: the complaint can disappear, its history cannot.
 */
const activitySchema = new mongoose.Schema(
  {
    complaint: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Complaint',
      required: true,
      index: true,
    },
    actor: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      default: null,
    },
    actorName: {
      type: String,
      default: 'System',
    },
    action: {
      type: String,
      required: true,
      enum: { values: ACTIVITY_ACTIONS, message: 'Unknown activity action: {VALUE}' },
    },
    // Human-readable line for the complaint timeline, e.g.
    // "Assigned to Ravi (staff) by Priya".
    message: { type: String, required: true, maxlength: 500 },
    meta: { type: mongoose.Schema.Types.Mixed, default: {} },
  },
  {
    timestamps: { createdAt: true, updatedAt: false },
    toJSON: {
      transform(_doc, ret) {
        delete ret.__v;
        return ret;
      },
    },
  }
);

activitySchema.index({ complaint: 1, createdAt: 1 });

export default mongoose.model('Activity', activitySchema);
