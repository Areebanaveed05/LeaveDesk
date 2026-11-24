
import mongoose from "mongoose";
import LeaveRequest, { REQUEST_TYPES } from "../models/LeaveRequest.js";
import User from "../models/User.js";

import {
  parseDateOnly,
  getBucket,
  BUCKET_NAMES,
  calculateDays,
  getDayRange,
  getBalance,
} from "../utils/leaveHelpers.js";

// Employee submits a request.
// Employee name, department and employee ID come from the server.
export const createRequest = async (req, res) => {
  try {
    const { type, startDate, endDate, reason } = req.body;

    if (!REQUEST_TYPES.includes(type)) {
      return res.status(400).json({ message: "Invalid request type" });
    }

    const start = parseDateOnly(startDate);
    const end = parseDateOnly(endDate);

    if (!start || !end) {
      return res.status(400).json({
        message: "Valid start and end dates are required",
      });
    }

    if (end < start) {
      return res.status(400).json({
        message: "End date must be on or after start date",
      });
    }

    if (type === "Half Day" && start.getTime() !== end.getTime()) {
      return res.status(400).json({
        message: "A Half Day request must be a single day",
      });
    }

    if (typeof reason !== "string" || !reason.trim()) {
      return res.status(400).json({
        message: "Request reason is required",
      });
    }

    const bucket = getBucket(type);

    if (bucket && start.getUTCFullYear() !== end.getUTCFullYear()) {
      return res.status(400).json({
        message: "Please submit a separate request for each calendar year",
      });
    }

    // Prevent overlapping Pending or Approved requests
    const overlapping = await LeaveRequest.findOne({
      employee: req.user._id,
      status: { $in: ["Pending", "Approved"] },
      startDate: { $lte: end },
      endDate: { $gte: start },
    });

    if (overlapping) {
      return res.status(409).json({
        message: "You already have a request that overlaps these dates",
      });
    }

    const days = calculateDays(type, start, end);

    // Check available leave balance
    if (bucket) {
      const balance = await getBalance(
        req.user,
        start.getUTCFullYear()
      );

      const available = balance[bucket].available;

      if (days > available) {
        return res.status(400).json({
          message: `Not enough ${BUCKET_NAMES[bucket]} left. Available: ${available} day(s), requested: ${days}.`,
        });
      }
    }

    const request = await LeaveRequest.create({
      employee: req.user._id,
      employeeName: req.user.name,
      department: req.user.department,
      type,
      startDate: start,
      endDate: end,
      days,
      reason: reason.trim(),
    });

    return res.status(201).json(request);
  } catch (err) {
    if (err.name === "ValidationError") {
      const messages = Object.values(err.errors).map((e) => e.message);

      return res.status(400).json({
        message: messages.join(", "),
      });
    }

    console.error("createRequest:", err);

    return res.status(500).json({
      message: "Server error",
    });
  }
};

// Employees see their own requests.
// Admins see all requests.
export const getRequests = async (req, res) => {
  try {
    const { status, type, today, date, employee } = req.query;

    const filter = {};

    if (status) filter.status = String(status);
    if (type) filter.type = String(type);

    if (req.user.role === "employee") {
      filter.employee = req.user._id;
    } else if (employee) {
      if (!mongoose.isValidObjectId(String(employee))) {
        return res.status(400).json({
          message: "Invalid employee ID",
        });
      }

      filter.employee = String(employee);
    }

    if (today === "true") {
      const range = getDayRange(date);

      if (!range) {
        return res.status(400).json({
          message: "date must be a valid YYYY-MM-DD date",
        });
      }

      filter.startDate = { $lte: range.end };
      filter.endDate = { $gte: range.start };
    }

    const requests = await LeaveRequest.find(filter).sort({
      createdAt: -1,
    });

    return res.json(requests);
  } catch (err) {
    console.error("getRequests:", err);

    return res.status(500).json({
      message: "Server error",
    });
  }
};

// Who is out today.
// Only approved requests are returned.
export const getOutToday = async (req, res) => {
  try {
    const range = getDayRange(req.query.date);

    if (!range) {
      return res.status(400).json({
        message: "date must be a valid YYYY-MM-DD date",
      });
    }

    const people = await LeaveRequest.find({
      status: "Approved",
      startDate: { $lte: range.end },
      endDate: { $gte: range.start },
    })
      .select("employeeName department type startDate endDate")
      .sort({ employeeName: 1 });

    return res.json(people);
  } catch (err) {
    console.error("getOutToday:", err);

    return res.status(500).json({
      message: "Server error",
    });
  }
};

// Admin approves or rejects a request.
export const updateRequestStatus = async (req, res) => {
  try {
    const { status } = req.body;

    if (!["Approved", "Rejected"].includes(status)) {
      return res.status(400).json({
        message: 'Status must be "Approved" or "Rejected"',
      });
    }

    const request = await LeaveRequest.findById(req.params.id);

    if (!request) {
      return res.status(404).json({
        message: "Request not found",
      });
    }

    // Rejection requires a reason
    let rejectionReason = "";

    if (status === "Rejected") {
      if (
        typeof req.body.rejectionReason !== "string" ||
        !req.body.rejectionReason.trim()
      ) {
        return res.status(400).json({
          message: "Please provide a reason for rejecting this request",
        });
      }

      rejectionReason = req.body.rejectionReason.trim();

      if (rejectionReason.length > 1000) {
        return res.status(400).json({
          message: "Rejection reason cannot exceed 1000 characters",
        });
      }
    }

    // Already in the requested status
    if (request.status === status) {
      return res.json(request);
    }

    // Check leave balance before approval
    const bucket = getBucket(request.type);

    if (status === "Approved" && bucket && request.employee) {
      const employee = await User.findById(request.employee);

      if (employee) {
        const balance = await getBalance(
          employee,
          request.startDate.getUTCFullYear(),
          request._id
        );

        if (request.days > balance[bucket].remaining) {
          return res.status(400).json({
            message: `Cannot approve: only ${balance[bucket].remaining} day(s) of ${BUCKET_NAMES[bucket]} left, request needs ${request.days}.`,
          });
        }
      }
    }

    request.status = status;
    request.reviewedBy = req.user._id;
    request.reviewedAt = new Date();

    // Save rejection reason only for rejected requests
    request.rejectionReason =
      status === "Rejected" ? rejectionReason : "";

    await request.save();

    return res.json(request);
  } catch (err) {
    if (err.name === "ValidationError") {
      const messages = Object.values(err.errors).map((e) => e.message);

      return res.status(400).json({
        message: messages.join(", "),
      });
    }

    console.error("updateRequestStatus:", err);

    return res.status(500).json({
      message: "Server error",
    });
  }
};

// Employee cancels their own request only while Pending.
export const deleteRequest = async (req, res) => {
  try {
    const request = await LeaveRequest.findOne({
      _id: req.params.id,
      employee: req.user._id,
    });

    if (!request) {
      return res.status(404).json({
        message: "Request not found",
      });
    }

    if (request.status !== "Pending") {
      return res.status(400).json({
        message: "Only pending requests can be cancelled",
      });
    }

    await request.deleteOne();

    return res.json({
      message: "Request cancelled",
      id: request._id,
    });
  } catch (err) {
    console.error("deleteRequest:", err);

    return res.status(500).json({
      message: "Server error",
    });
  }
};
