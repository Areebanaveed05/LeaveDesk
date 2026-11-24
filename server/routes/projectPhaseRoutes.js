import express from "express";
import {
  getProjectPhases,
  createProjectPhase,
  updateProjectPhase,
  deleteProjectPhase,
} from "../controllers/projectPhaseController.js";
import { protect } from "../middleware/authMiddleware.js";
import { validateObjectId } from "../middleware/validateObjectId.js";

const router = express.Router();

router.use(protect);
router.get("/:projectId", getProjectPhases);
router.post("/", createProjectPhase);
router.patch("/:id", validateObjectId, updateProjectPhase);
router.delete("/:id", validateObjectId, deleteProjectPhase);

export default router;
