import express from "express";

import {
  getProjects,
  createProject,
  updateProject,
  deleteProject,
} from "../controllers/projectController.js";

import {
  protect,
  adminOnly,
} from "../middleware/authMiddleware.js";

import { validateObjectId } from "../middleware/validateObjectId.js";

const router = express.Router();

// All project routes require authentication.
router.use(protect);

// Admin and employees can view relevant projects.
router.get("/", getProjects);

// Only admins can create, update, or delete projects.
router.post("/", adminOnly, createProject);
router.patch("/:id", adminOnly, validateObjectId, updateProject);
router.delete("/:id", adminOnly, validateObjectId, deleteProject);

export default router;
