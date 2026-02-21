import express from "express";
import {
  createTrafficTask,
  getAllTrafficTasks,
  updateTaskProgress,
  endTask,
  getMyTrafficTasks,
} from "../controllers/trafficTask.controller.js";
import { protect, authorize } from "../middleware/auth.middleware.js";

const router = express.Router();

router.post("/", protect, authorize("superAdmin"), createTrafficTask);
router.get("/", protect, authorize("superAdmin"), getAllTrafficTasks);
router.put(
  "/:id/progress",
  protect,
  authorize("superAdmin"),
  updateTaskProgress,
);
router.put("/:id/end", protect, authorize("superAdmin"), endTask);
router.get("/my-tasks", protect, authorize("merchant"), getMyTrafficTasks);

export default router;
