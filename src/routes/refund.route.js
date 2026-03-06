import express from "express";
import {
  createRefundRequest,
  getAllRefunds,
  processRefund,
} from "../controllers/refund.controller.js";
import { protect, authorize } from "../middleware/auth.middleware.js";

const router = express.Router();
// Merchant Route: Create a refund request
router.post("/", protect, authorize("merchant"), createRefundRequest);
router.get(
  "/",
  protect,
  authorize("superAdmin", "merchantAdmin"),
  getAllRefunds,
);
router.put("/:id/process", protect, authorize("superAdmin"), processRefund);

export default router;
