import express from "express";
import {
  getTasks,
  createTask,
  updateTaskStatus,
  updateTaskDependencies,
} from "../controllers/taskController.js";
import { protect } from "../middleware/authMiddleware.js";
import { validateObjectId } from "../middleware/validateObjectId.js";

const router = express.Router();

router.use(protect);
router.get("/", getTasks);
router.post("/", createTask);
router.patch("/:id/status", validateObjectId, updateTaskStatus);
router.patch("/:id/dependencies", validateObjectId, updateTaskDependencies);

export default router;
