
import { rateLimit, ipKeyGenerator } from "express-rate-limit";

// ==========================================
// 1. LOGIN LIMITER — Account + IP Based
// ==========================================

export const loginLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  limit: 5,

  standardHeaders: "draft-8",
  legacyHeaders: false,

  keyGenerator: (req) => {
    const ip = ipKeyGenerator(req.ip);

    const email = String(req.body?.email || "")
      .toLowerCase()
      .trim();

    return `${ip}:${email || "unknown"}`;
  },

  skipSuccessfulRequests: true,

  message: {
    message:
      "Too many failed login attempts for this account. Please try again after 15 minutes.",
  },
});

// ==========================================
// 2. GLOBAL LOGIN IP LIMITER
// ==========================================

export const loginIpLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  limit: 30,

  standardHeaders: "draft-8",
  legacyHeaders: false,

  skipSuccessfulRequests: true,

  message: {
    message:
      "Too many login attempts from this network. Please try again after 15 minutes.",
  },
});

// ==========================================
// 3. FORGOT PASSWORD LIMITER
// ==========================================

export const forgotPasswordLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  limit: 5,

  standardHeaders: "draft-8",
  legacyHeaders: false,

  message: {
    message:
      "Too many password recovery requests. Please try again after 15 minutes.",
  },
});

// ==========================================
// 4. RESET PASSWORD LIMITER
// ==========================================

export const resetPasswordLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  limit: 5,

  standardHeaders: "draft-8",
  legacyHeaders: false,

  skipSuccessfulRequests: true,

  message: {
    message:
      "Too many password reset attempts. Please try again after 15 minutes.",
  },
});
