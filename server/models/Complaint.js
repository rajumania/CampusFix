import mongoose from 'mongoose';
import {
  CATEGORIES,
  COMPLAINT_STATUS,
  PRIORITIES,
  ROLES,
} from '../utils/constants.js';

const MAX_IMAGES = 5;

const complaintSchema = new mongoose.Schema(
  {
    title: {
      type: String,
      required: [true, 'Complaint title is required'],
      trim: true,
      minlength: [5, 'Title must be at least 5 characters'],
      maxlength: [120, 'Title cannot exceed 120 characters'],
    },
    description: {
      type: String,
      required: [true, 'Complaint description is required'],
      trim: true,
      minlength: [15, 'Description must be at least 15 characters'],
      maxlength: [2000, 'Description cannot exceed 2000 characters'],
    },
    category: {
      type: String,
      required: [true, 'Category is required'],
      enum: { values: CATEGORIES, message: 'Unknown category: {VALUE}' },
    },
    priority: {
      type: String,
      enum: { values: PRIORITIES, message: 'Unknown priority: {VALUE}' },
      default: 'medium',
    },
    status: {
      type: String,
      enum: {
        values: Object.values(COMPLAINT_STATUS),
        message: 'Unknown status: {VALUE}',
      },
      default: COMPLAINT_STATUS.PENDING,
    },
    location: {
      type: String,
      trim: true,
      maxlength: [100, 'Location cannot exceed 100 characters'],
    },
    reportedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: [true, 'A complaint must be linked to the reporting student'],
    },
    assignedTo: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      default: null,
    },
    images: {
      type: [
        {
          url: { type: String, required: true },
          publicId: { type: String, required: true },
        },
      ],
      validate: {
        validator: (images) => images.length <= MAX_IMAGES,
        message: `A complaint can carry at most ${MAX_IMAGES} photographs`,
      },
      default: [],
    },
    resolutionRemarks: {
      type: String,
      trim: true,
      maxlength: [1000, 'Resolution remarks cannot exceed 1000 characters'],
    },
    rejectionReason: {
      type: String,
      trim: true,
      maxlength: [500, 'Rejection reason cannot exceed 500 characters'],
    },
    resolvedAt: { type: Date, default: null },
    // Set by an admin so a complaint can be hidden without destroying the audit trail.
    isDeleted: { type: Boolean, default: false },
    deletedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User', default: null },
  },
  {
    timestamps: true,
    toJSON: {
      virtuals: true,
      transform(_doc, ret) {
        delete ret.__v;
        return ret;
      },
    },
  }
);

// A complaint may only be handed to maintenance staff, never to another student.
// The value can arrive as an ObjectId or as a populated Document when an edit
// re-saves a complaint that was read with populate('assignedTo').
complaintSchema.path('assignedTo').validate(async (value) => {
  if (!value) return true;
  if (value?.role !== undefined) {
    return value.role === ROLES.STAFF && value.isActive !== false;
  }
  const staff = await mongoose.model('User').findById(value).select('role isActive');
  if (!staff) return false;
  return staff.role === ROLES.STAFF && staff.isActive;
}, 'Complaints can only be assigned to an active maintenance staff account');

// Dashboard and staff-queue queries both filter status first, then sort by recency.
complaintSchema.index({ status: 1, createdAt: -1 });
complaintSchema.index({ reportedBy: 1, createdAt: -1 });
complaintSchema.index({ assignedTo: 1, status: 1, createdAt: -1 });
complaintSchema.index({ category: 1, createdAt: -1 });

export default mongoose.model('Complaint', complaintSchema);
