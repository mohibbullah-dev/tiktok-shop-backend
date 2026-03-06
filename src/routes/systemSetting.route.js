import express from "express";
import {
  getSettings,
  updateSettings,
} from "../controllers/systemSetting.controller.js";
import { protect, authorize } from "../middleware/auth.middleware.js";

const router = express.Router();

router.get("/", getSettings); // Public read
router.put("/", protect, authorize("superAdmin"), updateSettings); // Admin write

export default router;
