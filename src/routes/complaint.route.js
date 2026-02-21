import express from "express";
import {
  submitComplaint,
  getMyComplaints,
  getAllComplaints,
  resolveComplaint,
} from "../controllers/complaint.controller.js";
import { protect, authorize } from "../middleware/auth.middleware.js";

const router = express.Router();

router.post("/", protect, authorize("merchant"), submitComplaint);
router.get("/my-complaints", protect, authorize("merchant"), getMyComplaints);
router.get(
  "/",
  protect,
  authorize("superAdmin", "merchantAdmin"),
  getAllComplaints,
);
router.put(
  "/:id/resolve",
  protect,
  authorize("superAdmin", "merchantAdmin"),
  resolveComplaint,
);

export default router;
