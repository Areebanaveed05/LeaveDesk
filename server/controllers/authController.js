
import jwt from "jsonwebtoken";
import User from "../models/User.js";
import crypto from "crypto";
import sendEmail from "../utils/sendEmail.js";

// ==========================================
// JWT TOKEN
// ==========================================

const signToken = (user) =>
  jwt.sign(
    {
      id: user._id,
      role: user.role,
      tokenVersion: user.tokenVersion ?? 0,
    },
    process.env.JWT_SECRET,
    {
      expiresIn: process.env.JWT_EXPIRES_IN || "7d",
    }
  );

// ==========================================
// SAFE USER RESPONSE
// ==========================================

const userPayload = (user) => ({
  id: user._id,
  name: user.name,
  email: user.email,
  role: user.role,
  department: user.department,
  leaveAllowance: user.leaveAllowance,
  mustChangePassword: user.mustChangePassword,
});

// ==========================================
// LOGIN
// ==========================================

export const login = async (req, res) => {
  try {
    const { email, password } = req.body;

    if (
      typeof email !== "string" ||
      typeof password !== "string" ||
      !email.trim() ||
      !password
    ) {
      return res.status(400).json({
        message: "Email and password are required",
      });
    }

    const user = await User.findOne({
      email: email.toLowerCase().trim(),
    }).select("+password +tokenVersion");

    // Same message for unknown email and incorrect password
    if (!user || !(await user.matchPassword(password))) {
      return res.status(401).json({
        message: "Invalid email or password",
      });
    }

    if (!user.isActive) {
      return res.status(403).json({
        message: "This account is disabled",
      });
    }

    return res.json({
      token: signToken(user),
      user: userPayload(user),
    });
  } catch (error) {
    console.error("Login error:", error.message);

    return res.status(500).json({
      message: "Server error",
    });
  }
};

// ==========================================
// GET CURRENT USER
// ==========================================

export const getMe = async (req, res) => {
  return res.json({
    user: userPayload(req.user),
  });
};

// ==========================================
// CHANGE PASSWORD
// ==========================================

export const changePassword = async (req, res) => {
  try {
    const { currentPassword, newPassword } = req.body;

    if (
      typeof currentPassword !== "string" ||
      typeof newPassword !== "string" ||
      !currentPassword ||
      !newPassword
    ) {
      return res.status(400).json({
        message: "Current and new passwords are required",
      });
    }

    if (newPassword.length < 8) {
      return res.status(400).json({
        message: "New password must be at least 8 characters",
      });
    }

    const user = await User.findById(req.user._id).select(
      "+password +tokenVersion"
    );

    if (!user) {
      return res.status(404).json({
        message: "User not found",
      });
    }

    if (!(await user.matchPassword(currentPassword))) {
      return res.status(401).json({
        message: "Current password is wrong",
      });
    }

    user.password = newPassword;
    user.mustChangePassword = false;
    user.tokenVersion = (user.tokenVersion || 0) + 1;

    await user.save();

    return res.json({
      message: "Password updated",
      user: userPayload(user),
    });
  } catch (error) {
    console.error("Change password error:", error.message);

    return res.status(500).json({
      message: "Server error",
    });
  }
};

// ==========================================
// FORGOT PASSWORD
// ==========================================

export const forgotPassword = async (req, res) => {
  try {
    const { email } = req.body;

    if (typeof email !== "string" || !email.trim()) {
      return res.status(400).json({
        message: "Email is required",
      });
    }

    const normalizedEmail = email.toLowerCase().trim();

    const user = await User.findOne({
      email: normalizedEmail,
      isActive: true,
    });

    // Same response whether the account exists or not
    const responseMessage =
      "If an active account exists with this email, a password reset link will be sent.";

    if (!user) {
      return res.status(200).json({
        message: responseMessage,
      });
    }

    // Generate a secure random token
    const resetToken = crypto.randomBytes(32).toString("hex");

    // Store only the hashed token
    user.resetPasswordToken = crypto
      .createHash("sha256")
      .update(resetToken)
      .digest("hex");

    // Token expires after 15 minutes
    user.resetPasswordExpires = new Date(
      Date.now() + 15 * 60 * 1000
    );

    await user.save();

    // Create reset link
    const resetUrl =
      `${process.env.CLIENT_URL || "http://localhost:5173"}` +
      `/reset-password?token=${resetToken}`;

    try {
      await sendEmail({
        to: user.email,
        subject: "LeaveDesk - Password Reset",

        text: `You requested a password reset. Open this link within 15 minutes: ${resetUrl}`,

        html: `
          <div style="font-family: Arial, sans-serif; max-width: 600px; margin: auto;">
            <h2 style="color: #2563EB;">LeaveDesk</h2>

            <h3>Reset Your Password</h3>

            <p>We received a request to reset your LeaveDesk password.</p>

            <p>This link will expire in 15 minutes.</p>

            <a
              href="${resetUrl}"
              style="display: inline-block; padding: 12px 24px; background: #2563EB; color: white; text-decoration: none; border-radius: 8px;"
            >
              Reset Password
            </a>

            <p>If you did not request this, you can ignore this email.</p>
          </div>
        `,
      });
    } catch (emailError) {
      // Clear reset token if email sending fails
      user.resetPasswordToken = undefined;
      user.resetPasswordExpires = undefined;

      await user.save();

      console.error("Email sending failed:", emailError.message);

      throw emailError;
    }

    return res.status(200).json({
      message: responseMessage,
    });
  } catch (error) {
    console.error("Forgot password error:", error.message);

    return res.status(500).json({
      message: "Unable to process password reset request",
    });
  }
};

// ==========================================
// RESET PASSWORD
// ==========================================

export const resetPassword = async (req, res) => {
  try {
    const { token, newPassword } = req.body;

    if (
      typeof token !== "string" ||
      typeof newPassword !== "string" ||
      !token ||
      !newPassword
    ) {
      return res.status(400).json({
        message: "Token and new password are required",
      });
    }

    if (newPassword.length < 8) {
      return res.status(400).json({
        message: "Password must be at least 8 characters",
      });
    }

    // Hash the received token
    const hashedToken = crypto
      .createHash("sha256")
      .update(token)
      .digest("hex");

    // Find an active user with a valid, unexpired token
    const user = await User.findOne({
      resetPasswordToken: hashedToken,
      resetPasswordExpires: { $gt: Date.now() },
      isActive: true,
    }).select("+tokenVersion");

    if (!user) {
      return res.status(400).json({
        message: "Password reset link is invalid or expired",
      });
    }

    // Update password
    user.password = newPassword;
    user.mustChangePassword = false;

    // Invalidate existing login sessions
    user.tokenVersion = (user.tokenVersion || 0) + 1;

    // Invalidate reset token after successful use
    user.resetPasswordToken = undefined;
    user.resetPasswordExpires = undefined;

    await user.save();

    return res.status(200).json({
      message: "Password has been reset successfully. Please sign in.",
    });
  } catch (error) {
    console.error("Reset password error:", error.message);

    return res.status(500).json({
      message: "Unable to reset password",
    });
  }
};
