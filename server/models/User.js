import mongoose from 'mongoose';
import bcrypt from 'bcryptjs';
import { ROLES } from '../utils/constants.js';

const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;

const userSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: [true, 'Name is required'],
      trim: true,
      minlength: [2, 'Name must be at least 2 characters'],
      maxlength: [60, 'Name cannot exceed 60 characters'],
    },
    email: {
      type: String,
      required: [true, 'Email is required'],
      unique: true,
      lowercase: true,
      trim: true,
      match: [EMAIL_PATTERN, 'Please provide a valid email address'],
    },
    password: {
      type: String,
      required: [true, 'Password is required'],
      minlength: [6, 'Password must be at least 6 characters'],
      select: false,
    },
    role: {
      type: String,
      enum: {
        values: Object.values(ROLES),
        message: 'Role must be one of student, admin or staff',
      },
      default: ROLES.STUDENT,
    },
    studentId: {
      type: String,
      trim: true,
      uppercase: true,
      unique: true,
      sparse: true,
      maxlength: [20, 'Student ID cannot exceed 20 characters'],
    },
    staffId: {
      type: String,
      trim: true,
      uppercase: true,
      unique: true,
      sparse: true,
      maxlength: [20, 'Staff ID cannot exceed 20 characters'],
    },
    department: {
      type: String,
      trim: true,
      maxlength: [80, 'Department cannot exceed 80 characters'],
    },
    phone: {
      type: String,
      trim: true,
      match: [/^[0-9+\-\s()]{7,16}$/, 'Please provide a valid phone number'],
    },
    isActive: {
      type: Boolean,
      default: true,
    },
  },
  {
    timestamps: true,
    toJSON: {
      virtuals: true,
      transform(_doc, ret) {
        delete ret.password;
        delete ret.__v;
        return ret;
      },
    },
  }
);

// Re-hashing an already-hashed password would double-wrap it and lock the user out,
// so only hash when the plain password actually changed.
userSchema.pre('save', async function hashPassword(next) {
  if (!this.isModified('password')) return next();
  this.password = await bcrypt.hash(this.password, 12);
  return next();
});

userSchema.methods.matchPassword = function matchPassword(candidate) {
  return bcrypt.compare(candidate, this.password);
};

export default mongoose.model('User', userSchema);
