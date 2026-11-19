import mongoose from "mongoose";

const leaveRequestSchema = new mongoose.Schema({
  employeeName: {
    type: String,
    required: [true, "Employee name is required"],
    trim: true,
  },
  department: {
    type: String,
    required: [true, "Department is required"],
    enum: ["Engineering", "Design", "QA", "Product", "Operations"],
  },
  type: {
    type: String,
    required: [true, "Request type is required"],
    enum: ["Work From Home", "Annual Leave", "Sick Leave", "Half Day"],
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
  createdAt: {
    type: Date,
    default: Date.now,
  },
});

const LeaveRequest = mongoose.model("LeaveRequest", leaveRequestSchema);

export default LeaveRequest;