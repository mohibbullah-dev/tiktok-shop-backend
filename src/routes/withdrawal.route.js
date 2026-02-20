import express from "express";
import {
  submitWithdrawal,
  getAllWithdrawals,
  getMyWithdrawals,
  approveWithdrawal,
  cancelWithdrawal,
} from "../controllers/withdrawal.controller.js";
import { protect, authorize } from "../middleware/auth.middleware.js";

const router = express.Router();

// Merchant routes
router.post("/", protect, authorize("merchant"), submitWithdrawal);
router.get("/my-records", protect, authorize("merchant"), getMyWithdrawals);

// Admin routes
router.get(
  "/",
  protect,
  authorize("superAdmin", "merchantAdmin"),
  getAllWithdrawals,
);
router.put("/:id/approve", protect, authorize("superAdmin"), approveWithdrawal);
router.put(
  "/:id/cancel",
  protect,
  authorize("superAdmin", "merchantAdmin"),
  cancelWithdrawal,
);

export default router;
