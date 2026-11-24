import jwt from "jsonwebtoken";
import User from "../models/User.js";

// While an account still has its temporary password,
// only these two endpoints may be used.
const ALLOWED_WITH_TEMP_PASSWORD = [
  "/api/auth/me",
  "/api/auth/change-password",
];

// Requires a valid login token. Puts the logged-in user on req.user.
export const protect = async (req, res, next) => {
  try {
    const header = req.headers.authorization || "";
    const token = header.startsWith("Bearer ") ? header.slice(7) : null;

    if (!token) {
      return res.status(401).json({ message: "Please log in to continue" });
    }

    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    const user = await User.findById(decoded.id).select("+tokenVersion");

    if (!user || !user.isActive) {
      return res
        .status(401)
        .json({ message: "Account not found or has been disabled" });
    }

    if (decoded.tokenVersion !== user.tokenVersion) {
      return res.status(401).json({
        message: "Your session is no longer valid. Please log in again.",
      });
    }

    if (
      user.mustChangePassword &&
      !ALLOWED_WITH_TEMP_PASSWORD.includes(req.baseUrl + req.path)
    ) {
      return res.status(403).json({
        message: "Please change your temporary password first",
        code: "PASSWORD_CHANGE_REQUIRED",
      });
    }

    req.user = user;
    next();
  } catch {
    return res
      .status(401)
      .json({ message: "Session expired. Please log in again" });
  }
};

// Use after protect: only admins may continue.
export const adminOnly = (req, res, next) => {
  if (req.user?.role === "admin") return next();

  return res.status(403).json({ message: "Admin access only" });
};

// Use after protect: only employees may continue.
export const employeeOnly = (req, res, next) => {
  if (req.user?.role === "employee") return next();

  return res.status(403).json({ message: "Employee access only" });
};
