import express from "express";
import {
  getVipLevels,
  createVipLevel,
  updateVipLevel,
  toggleVipLevel,
  applyVipUpgrade,
  getVipApplications,
  reviewVipApplication,
  seedVipLevels,
} from "../controllers/vip.controller.js";
import { protect, authorize } from "../middleware/auth.middleware.js";

const router = express.Router();

// Public
router.get("/levels", getVipLevels);

// Merchant
router.post("/apply", protect, authorize("merchant"), applyVipUpgrade);

// Admin
router.post("/levels", protect, authorize("superAdmin"), createVipLevel);
router.put("/levels/:id", protect, authorize("superAdmin"), updateVipLevel);
router.put(
  "/levels/:id/toggle",
  protect,
  authorize("superAdmin"),
  toggleVipLevel,
);
router.post("/seed", protect, authorize("superAdmin"), seedVipLevels);
router.get(
  "/applications",
  protect,
  authorize("superAdmin", "merchantAdmin"),
  getVipApplications,
);
router.put(
  "/applications/:id/review",
  protect,
  authorize("superAdmin"),
  reviewVipApplication,
);

export default router;
