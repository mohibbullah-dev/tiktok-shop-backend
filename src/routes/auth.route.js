import express from "express";
import {
  createAdmin,
  getMe,
  login,
  registerMerchant,
} from "../controllers/auth.controller.js";
import { authorize, protect } from "../middleware/auth.middleware.js";

const router = express.Router();

// Public routes
router.post("/register", registerMerchant);
router.post("/login", login);

// Private routes
router.get("/me", protect, getMe);

// Super admin only
router.post("/create-admin", protect, authorize("superAdmin"), createAdmin);

export default router;
