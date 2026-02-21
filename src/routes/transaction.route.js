import express from "express";
import {
  getMyTransactions,
  getAllTransactions,
  getFinancialStatements,
  deleteTransaction,
} from "../controllers/transaction.controller.js";
import { protect, authorize } from "../middleware/auth.middleware.js";

const router = express.Router();

// Merchant routes
router.get("/my-records", protect, authorize("merchant"), getMyTransactions);
router.get(
  "/financial-statements",
  protect,
  authorize("merchant"),
  getFinancialStatements,
);

// Admin routes
router.get(
  "/",
  protect,
  authorize("superAdmin", "merchantAdmin"),
  getAllTransactions,
);
router.delete("/:id", protect, authorize("superAdmin"), deleteTransaction);

export default router;
