
import express from "express";

import {
  login,
  getMe,
  changePassword,
  forgotPassword,
  resetPassword,
} from "../controllers/authController.js";

import { protect } from "../middleware/authMiddleware.js";

import {
  loginLimiter,
  loginIpLimiter,
  forgotPasswordLimiter,
  resetPasswordLimiter,
} from "../middleware/rateLimitMiddleware.js";

const router = express.Router();

// ==========================================
// AUTHENTICATION
// ==========================================

router.post(
  "/login",
  loginIpLimiter,
  loginLimiter,
  login
);

// ==========================================
// PASSWORD RECOVERY
// ==========================================

// Request a password reset email
router.post(
  "/forgot-password",
  forgotPasswordLimiter,
  forgotPassword
);

// Submit a new password using the reset token
router.post(
  "/reset-password",
  resetPasswordLimiter,
  resetPassword
);

// ==========================================
// PROTECTED ROUTES
// ==========================================

router.get("/me", protect, getMe);

router.patch("/change-password", protect, changePassword);

export default router;
