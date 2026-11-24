
import express from "express";

import {
  checkIn,
  checkOut,
  getMyAttendance,
  getAdminAttendance,
} from "../controllers/attendanceController.js";

import {
  protect,
  adminOnly,
  employeeOnly,
} from "../middleware/authMiddleware.js";

const router = express.Router();

// All attendance endpoints require authentication.
router.use(protect);

// ------------------------------------------
// EMPLOYEE ROUTES
// ------------------------------------------

// Employee can check in.
router.post("/check-in", employeeOnly, checkIn);

// Employee can check out.
router.post("/check-out", employeeOnly, checkOut);

// Employee can view only their own attendance history.
router.get("/me", employeeOnly, getMyAttendance);

// ------------------------------------------
// ADMIN ROUTES
// ------------------------------------------

// Admin can view all active employees' attendance.
router.get("/", adminOnly, getAdminAttendance);

export default router;
