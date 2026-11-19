import mongoose from "mongoose";
import LeaveRequest from "../models/LeaveRequest.js";

export const getRequests = async (req, res) => {
  try {
    const { status, type, today } = req.query;
    const filter = {};

    if (status) filter.status = status;
    if (type) filter.type = type;

    if (today === "true") {
      const startOfToday = new Date();
      startOfToday.setHours(0, 0, 0, 0);

      const endOfToday = new Date();
      endOfToday.setHours(23, 59, 59, 999);

      // Active today = started on/before today AND ends on/after today
      filter.startDate = { $lte: endOfToday };
      filter.endDate = { $gte: startOfToday };
    }

    const requests = await LeaveRequest.find(filter).sort({ createdAt: -1 });
    res.json(requests);
  } catch (err) {
    res.status(500).json({ message: "Server error" });
  }
};

export const updateRequestStatus = async (req, res) => {
  try {
    const { id } = req.params;
    const { status } = req.body;

    if (!mongoose.isValidObjectId(id)) {
      return res.status(400).json({ message: "Invalid request ID" });
    }

    if (!["Approved", "Rejected"].includes(status)) {
      return res
        .status(400)
        .json({ message: 'Status must be "Approved" or "Rejected"' });
    }

    const updated = await LeaveRequest.findByIdAndUpdate(
      id,
      { status },
      { new: true, runValidators: true },
    );

    if (!updated) {
      return res.status(404).json({ message: "Request not found" });
    }

    res.json(updated);
  } catch (err) {
    res.status(500).json({ message: "Server error" });
  }
};

export const deleteRequest = async (req, res) => {
  try {
    const { id } = req.params;

    if (!mongoose.isValidObjectId(id)) {
      return res.status(400).json({ message: "Invalid request ID" });
    }

    const deleted = await LeaveRequest.findByIdAndDelete(id);

    if (!deleted) {
      return res.status(404).json({ message: "Request not found" });
    }

    res.json({ message: "Request deleted", id });
  } catch (err) {
    res.status(500).json({ message: "Server error" });
  }
};

export const createRequest = async (req, res) => {
  try {
    const request = await LeaveRequest.create(req.body);
    res.status(201).json(request);
  } catch (err) {
    console.error("CREATE REQUEST ERROR:", err);

    if (err.name === "ValidationError") {
      const messages = Object.values(err.errors).map((e) => e.message);
      return res.status(400).json({
        message: messages.join(", "),
      });
    }

    res.status(500).json({
      message: "Server error",
      error: err.message,
    });
  }
};
