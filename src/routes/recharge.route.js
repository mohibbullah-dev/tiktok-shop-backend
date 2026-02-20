import express from "express";
import {
  submitRecharge,
  getAllRecharges,
  getMyRecharges,
  reviewRecharge,
} from "../controllers/recharge.controller.js";
import { protect, authorize } from "../middleware/auth.middleware.js";

const router = express.Router();

// Merchant routes
router.post("/", protect, authorize("merchant"), submitRecharge);
router.get("/my-records", protect, authorize("merchant"), getMyRecharges);

// Admin routes
router.get(
  "/",
  protect,
  authorize("superAdmin", "merchantAdmin"),
  getAllRecharges,
);
router.put("/:id/review", protect, authorize("superAdmin"), reviewRecharge);

export default router;
