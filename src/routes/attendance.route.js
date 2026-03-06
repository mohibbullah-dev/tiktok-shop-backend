import express from "express";
import {
  signIn,
  getCalendar,
  getAllAttendance,
  revokeAttendance,
} from "../controllers/attendance.controller.js";
import { protect, authorize } from "../middleware/auth.middleware.js";

const router = express.Router();

router.post("/sign-in", protect, authorize("merchant"), signIn);
router.get("/calendar", protect, authorize("merchant"), getCalendar);
router.get("/", protect, authorize("superAdmin"), getAllAttendance);
router.delete("/:id", protect, authorize("superAdmin"), revokeAttendance);

export default router;
