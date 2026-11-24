import mongoose from "mongoose";

const sessionSchema = new mongoose.Schema(
  {
    checkIn: {
      type: Date,
      required: true,
    },
    checkOut: {
      type: Date,
      default: null,
    },
  },
  { _id: true }
);

const attendanceSchema = new mongoose.Schema(
  {
    employee: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
      index: true,
    },

    // Pakistan calendar date: YYYY-MM-DD.
    dateKey: {
      type: String,
      required: true,
    },

    sessions: {
      type: [sessionSchema],
      default: [],
    },

    // 480 = full day, 240 = half day, 0 = approved full-day leave.
    requiredMinutes: {
      type: Number,
      default: 480,
      min: 0,
    },

    workedMinutes: {
      type: Number,
      default: 0,
      min: 0,
    },

    shortageMinutes: {
      type: Number,
      default: 480,
      min: 0,
    },

    extraMinutes: {
      type: Number,
      default: 0,
      min: 0,
    },
  },
  { timestamps: true }
);

attendanceSchema.index({ employee: 1, dateKey: 1 }, { unique: true });
attendanceSchema.index({ employee: 1, dateKey: -1 });

const Attendance = mongoose.model("Attendance", attendanceSchema);

export default Attendance;
