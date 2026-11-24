import express from "express";
import {
  createRequest,
  getRequests,
  getOutToday,
  updateRequestStatus,
  deleteRequest,
} from "../controllers/requestController.js";
import {
  protect,
  adminOnly,
  employeeOnly,
} from "../middleware/authMiddleware.js";
import { validateObjectId } from "../middleware/validateObjectId.js";

const router = express.Router();

// Everything below needs a valid login
router.use(protect);

router.get("/out-today", getOutToday); // any logged-in user
router.get("/", getRequests); // employee: own, admin: all
router.post("/", employeeOnly, createRequest);
router.patch("/:id/status", adminOnly, validateObjectId, updateRequestStatus);
router.delete("/:id", employeeOnly, validateObjectId, deleteRequest);

export default router;
