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
  menualRecharge,
  getMerchantAdminStats,
} from "../controllers/merchant.controller.js";
import { protect, authorize } from "../middleware/auth.middleware.js";

const router = express.Router();

// Merchant's own store routes (merchant only)
router.get("/my-store", protect, authorize("merchant"), getMyStore);
router.put("/my-store", protect, authorize("merchant"), updateMyStore);
router.get(
  "/my-stats",
  protect,
  authorize("merchantAdmin"),
  getMerchantAdminStats,
);
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
  authorize("superAdmin", "merchantAdmin", "dispatchAdmin"),
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

// ── 1. Toggle withdrawal forbidden ──────────────────────────
// PUT /api/merchants/:id/toggle-withdrawal
router.put(
  "/:id/toggle-withdrawal",
  protect,
  authorize("superAdmin", "merchantAdmin"),
  async (req, res) => {
    try {
      const merchant = await Merchant.findById(req.params.id);
      if (!merchant) return res.status(404).json({ message: "Not found" });

      merchant.withdrawalForbidden = !merchant.withdrawalForbidden;
      await merchant.save();

      res.json({
        message: `Withdrawal ${merchant.withdrawalForbidden ? "forbidden" : "allowed"}`,
        withdrawalForbidden: merchant.withdrawalForbidden,
      });
    } catch (err) {
      res.status(500).json({ message: "Server error" });
    }
  },
);

// ── 2. Adjust funds (add or deduct) ─────────────────────────
// POST /api/merchants/:id/adjust-funds
router.post(
  "/:id/adjust-funds",
  protect,
  authorize("superAdmin"),
  async (req, res) => {
    try {
      const { amount, type, note } = req.body;

      if (!amount || amount <= 0) {
        return res.status(400).json({ message: "Invalid amount" });
      }

      const merchant = await Merchant.findById(req.params.id);
      if (!merchant) return res.status(404).json({ message: "Not found" });

      if (type === "deduct" && merchant.balance < amount) {
        return res.status(400).json({ message: "Insufficient balance" });
      }

      const before = merchant.balance;

      if (type === "add") {
        merchant.balance += amount;
      } else {
        merchant.balance -= amount;
      }
      await merchant.save();

      // Create transaction record
      await Transaction.create({
        merchant: merchant._id,
        type: type === "add" ? "adminAdd" : "adminDeduct",
        amount: type === "add" ? amount : -amount,
        balanceBefore: before,
        balanceAfter: merchant.balance,
        description: note || `Admin ${type} funds`,
        status: "completed",
      });

      res.json({
        message: `Funds ${type === "add" ? "added" : "deducted"} successfully`,
        newBalance: merchant.balance,
      });
    } catch (err) {
      res.status(500).json({ message: "Server error" });
    }
  },
);

// ── 3. Manual recharge ───────────────────────────────────────
// POST /api/merchants/:id/manual-recharge
router.post(
  "/:id/manual-recharge",
  protect,
  authorize("superAdmin"),
  menualRecharge,
);

export default router;
