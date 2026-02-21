import express from "express";
import {
  registerMerchant,
  login,
  logout,
  getMe,
  createAdmin,
  setPaymentPassword,
  updateLanguage,
  updateProfile,
  changePassword,
  changeFundsPassword,
} from "../controllers/auth.controller.js";
import { protect, authorize } from "../middleware/auth.middleware.js";

const router = express.Router();

// Public routes
router.post("/register", registerMerchant);
router.post("/login", login);

// Private routes
router.get("/me", protect, getMe);
router.post("/logout", protect, logout);
router.put("/language", protect, updateLanguage);
router.put("/update-profile", protect, updateProfile);
router.put(
  "/payment-password",
  protect,
  authorize("merchant"),
  setPaymentPassword,
);
router.put("/change-password", protect, changePassword);
router.put("/change-funds-password", protect, changeFundsPassword);

// Super admin only
router.post("/create-admin", protect, authorize("superAdmin"), createAdmin);

export default router;
