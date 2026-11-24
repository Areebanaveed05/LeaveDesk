
import express from "express";

import {
  getDepartments,
  createDepartment,
  updateDepartment,
  getDepartmentEmployees,
} from "../controllers/departmentController.js";

import {
  protect,
  adminOnly,
} from "../middleware/authMiddleware.js";

import { validateObjectId } from "../middleware/validateObjectId.js";

const router = express.Router();

router.use(protect);

router.get("/", getDepartments);
router.get("/:id/employees", validateObjectId, adminOnly, getDepartmentEmployees);

router.post("/", adminOnly, createDepartment);
router.patch("/:id", adminOnly, validateObjectId, updateDepartment);

export default router;
