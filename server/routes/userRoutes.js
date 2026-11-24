import express from "express";
import {
  createEmployee,
  getEmployees,
  getEmployeeSummary,
  getMySummary,
  updateEmployee,
  resetEmployeePassword,
} from "../controllers/userController.js";
import {
  protect,
  adminOnly,
  employeeOnly,
} from "../middleware/authMiddleware.js";
import { validateObjectId } from "../middleware/validateObjectId.js";

const router = express.Router();

// Everything below needs a valid login
router.use(protect);

// Employee: own balance and counts (must stay above the /:id routes)
router.get("/me/summary", employeeOnly, getMySummary);

// Admin: manage employees
router.get("/", adminOnly, getEmployees);
router.post("/", adminOnly, createEmployee);
router.get("/:id/summary", adminOnly, validateObjectId, getEmployeeSummary);
router.patch("/:id", adminOnly, validateObjectId, updateEmployee);
router.patch(
  "/:id/reset-password",
  adminOnly,
  validateObjectId,
  resetEmployeePassword
);

export default router;
