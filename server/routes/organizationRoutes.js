
import express from "express";

import {
  getOrganizationUnits,
  getOrganizationTree,
  createOrganizationUnit,
  updateOrganizationUnit,
  updateOrganizationUnitStatus,
} from "../controllers/organizationController.js";

import {
  protect,
  adminOnly,
} from "../middleware/authMiddleware.js";

import { validateObjectId } from "../middleware/validateObjectId.js";

const router = express.Router();

// All organization routes require authentication.
router.use(protect);

// GET: Fetch complete Department → Sub-department → Team hierarchy.
router.get("/tree", getOrganizationTree);

// GET: Fetch individual organization units with optional filters.
router.get("/", getOrganizationUnits);

// POST: Only admin can create organization units.
router.post("/", adminOnly, createOrganizationUnit);

// PATCH: Only admin can update organization units.
router.patch(
  "/:id",
  adminOnly,
  validateObjectId,
  updateOrganizationUnit
);

// PATCH: Only admin can activate or deactivate organization units.
router.patch(
  "/:id/status",
  adminOnly,
  validateObjectId,
  updateOrganizationUnitStatus
);

export default router;
