import mongoose from "mongoose";

// Rejects a malformed :id in the URL before it reaches the controller.
export const validateObjectId = (req, res, next) => {
  if (!mongoose.isValidObjectId(req.params.id)) {
    return res.status(400).json({ message: "Invalid ID" });
  }

  next();
};
