import mongoose from "mongoose";

export const REQUEST_TYPES = [
  "Work From Home",
  "Annual Leave",
  "Sick Leave",
  "Half Day",
];

const leaveRequestSchema = new mongoose.Schema({
  employee: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "User",
    required: [true, "Employee is required"],
    index: true,
  },

  employeeName: {
    type: String,
    required: [true, "Employee name is required"],
    trim: true,
  },

  department: {
    type: String,
    required: [true, "Department is required"],
    trim: true,
  },

  type: {
    type: String,
    required: [true, "Request type is required"],
    enum: REQUEST_TYPES,
  },

  startDate: {
    type: Date,
    required: [true, "Start date is required"],
  },

  endDate: {
    type: Date,
    required: [true, "End date is required"],
    validate: {
      validator: function (value) {
        return value >= this.startDate;
      },
      message: "End date must be on or after start date",
    },
  },

  days: {
    type: Number,
    required: [true, "Number of days is required"],
    min: [0.5, "A request must be at least half a day"],
  },

  reason: {
    type: String,
    required: [true, "Reason is required"],
    trim: true,
  },

  status: {
    type: String,
    enum: ["Pending", "Approved", "Rejected"],
    default: "Pending",
  },

  rejectionReason: {
    type: String,
    trim: true,
    default: "",
    maxlength: [1000, "Rejection reason cannot exceed 1000 characters"],
  },

  reviewedBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "User",
  },

  reviewedAt: {
    type: Date,
  },

  createdAt: {
    type: Date,
    default: Date.now,
  },
});

leaveRequestSchema.index({ employee: 1, startDate: 1 });

const LeaveRequest = mongoose.model("LeaveRequest", leaveRequestSchema);

export default LeaveRequest;
