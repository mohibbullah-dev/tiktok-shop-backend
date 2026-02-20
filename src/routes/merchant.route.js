import express from "express";
import {
  getAllMerchants,
  getMerchantById,
  updateMerchantStatus,
  toggleWithdrawal,
  addFunds,
  deductFunds,
  getMyStore,
  updateMyStore,
  updateBanners,
  getDashboardStats,
} from "../controllers/merchant.controller.js";
import { protect, authorize } from "../middleware/auth.middleware.js";

const router = express.Router();

// Merchant's own store routes (merchant only)
router.get("/my-store", protect, authorize("merchant"), getMyStore);
router.put("/my-store", protect, authorize("merchant"), updateMyStore);
router.put("/my-store/banners", protect, authorize("merchant"), updateBanners);

// Admin dashboard stats
router.get(
  "/dashboard-stats",
  protect,
  authorize("superAdmin"),
  getDashboardStats,
);

// Admin routes
router.get(
  "/",
  protect,
  authorize("superAdmin", "merchantAdmin"),
  getAllMerchants,
);

router.get(
  "/:id",
  protect,
  authorize("superAdmin", "merchantAdmin"),
  getMerchantById,
);

router.put(
  "/:id/status",
  protect,
  authorize("superAdmin"),
  updateMerchantStatus,
);

router.put(
  "/:id/withdrawal-status",
  protect,
  authorize("superAdmin", "merchantAdmin"),
  toggleWithdrawal,
);

router.post("/:id/add-funds", protect, authorize("superAdmin"), addFunds);

router.post("/:id/deduct-funds", protect, authorize("superAdmin"), deductFunds);

export default router;
