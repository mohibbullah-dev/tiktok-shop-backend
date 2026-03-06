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
import User from "../models/user.model.js";
import Merchant from "../models/merchant.model.js";
import Recharge from "../models/recharge.model.js";
import Withdrawal from "../models/withdrawal.model.js";
import Order from "../models/order.model.js";

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

//------------------------------------------------------------------------------//
// ─── Add this route to your backend/routes/auth.js ───────────
// GET /api/auth/admin/stats
// Access: superAdmin, merchantAdmin, dispatchAdmin

router.get(
  "/admin/stats",
  protect,
  authorize("superAdmin", "merchantAdmin", "dispatchAdmin"),
  async (req, res) => {
    try {
      const now = new Date();

      // Day boundaries
      const todayStart = new Date(now);
      todayStart.setHours(0, 0, 0, 0);
      const todayEnd = new Date(now);
      todayEnd.setHours(23, 59, 59, 999);

      const yesterdayStart = new Date(todayStart);
      yesterdayStart.setDate(yesterdayStart.getDate() - 1);
      const yesterdayEnd = new Date(todayEnd);
      yesterdayEnd.setDate(yesterdayEnd.getDate() - 1);

      // Month boundaries
      const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);
      const lastMonthStart = new Date(now.getFullYear(), now.getMonth() - 1, 1);
      const lastMonthEnd = new Date(
        now.getFullYear(),
        now.getMonth(),
        0,
        23,
        59,
        59,
        999,
      );

      // Helper: count documents in range
      const count = (Model, field, start, end, extra = {}) =>
        Model.countDocuments({
          [field]: { $gte: start, $lte: end },
          ...extra,
        });

      // Helper: sum field in range
      const sum = async (
        Model,
        sumField,
        dateField,
        start,
        end,
        extra = {},
      ) => {
        const result = await Model.aggregate([
          { $match: { [dateField]: { $gte: start, $lte: end }, ...extra } },
          { $group: { _id: null, total: { $sum: `$${sumField}` } } },
        ]);
        return result[0]?.total || 0;
      };

      // Run all queries in parallel
      const [
        // Registrations (users)
        regToday,
        regYest,
        regMonth,
        regLastMonth,
        // Store registrations (merchants)
        storeToday,
        storeYest,
        storeMonth,
        storeLastMonth,
        // Recharge amounts
        rcToday,
        rcYest,
        rcMonth,
        rcLastMonth,
        // Recharge counts
        rcCntToday,
        rcCntYest,
        rcCntMonth,
        rcCntLastMonth,
        // Withdrawals
        wdToday,
        wdYest,
        wdMonth,
        wdLastMonth,
        // Profit
        prToday,
        prYest,
        prMonth,
        prLastMonth,
        // Order statuses
        ordCompleted,
        ordPending,
        ordShipped,
        ordCancelled,
      ] = await Promise.all([
        // Users
        count(User, "createdAt", todayStart, todayEnd),
        count(User, "createdAt", yesterdayStart, yesterdayEnd),
        count(User, "createdAt", monthStart, todayEnd),
        count(User, "createdAt", lastMonthStart, lastMonthEnd),
        // Merchants
        count(Merchant, "createdAt", todayStart, todayEnd),
        count(Merchant, "createdAt", yesterdayStart, yesterdayEnd),
        count(Merchant, "createdAt", monthStart, todayEnd),
        count(Merchant, "createdAt", lastMonthStart, lastMonthEnd),
        // Recharge sum (approved only)
        sum(Recharge, "price", "createdAt", todayStart, todayEnd, {
          status: "approved",
        }),
        sum(Recharge, "price", "createdAt", yesterdayStart, yesterdayEnd, {
          status: "approved",
        }),
        sum(Recharge, "price", "createdAt", monthStart, todayEnd, {
          status: "approved",
        }),
        sum(Recharge, "price", "createdAt", lastMonthStart, lastMonthEnd, {
          status: "approved",
        }),
        // Recharge count
        count(Recharge, "createdAt", todayStart, todayEnd, {
          status: "approved",
        }),
        count(Recharge, "createdAt", yesterdayStart, yesterdayEnd, {
          status: "approved",
        }),
        count(Recharge, "createdAt", monthStart, todayEnd, {
          status: "approved",
        }),
        count(Recharge, "createdAt", lastMonthStart, lastMonthEnd, {
          status: "approved",
        }),
        // Withdrawals (approved/withdrawn)
        sum(Withdrawal, "extractPrice", "createdAt", todayStart, todayEnd, {
          status: { $in: ["approved", "withdrawn"] },
        }),
        sum(
          Withdrawal,
          "extractPrice",
          "createdAt",
          yesterdayStart,
          yesterdayEnd,
          { status: { $in: ["approved", "withdrawn"] } },
        ),
        sum(Withdrawal, "extractPrice", "createdAt", monthStart, todayEnd, {
          status: { $in: ["approved", "withdrawn"] },
        }),
        sum(
          Withdrawal,
          "extractPrice",
          "createdAt",
          lastMonthStart,
          lastMonthEnd,
          { status: { $in: ["approved", "withdrawn"] } },
        ),
        // Profit (from completed orders)
        sum(Order, "earnings", "createdAt", todayStart, todayEnd, {
          status: "completed",
        }),
        sum(Order, "earnings", "createdAt", yesterdayStart, yesterdayEnd, {
          status: "completed",
        }),
        sum(Order, "earnings", "createdAt", monthStart, todayEnd, {
          status: "completed",
        }),
        sum(Order, "earnings", "createdAt", lastMonthStart, lastMonthEnd, {
          status: "completed",
        }),
        // Order statuses (all time)
        Order.countDocuments({ status: "completed" }),
        Order.countDocuments({
          status: { $in: ["pendingPayment", "pendingShipment"] },
        }),
        Order.countDocuments({ status: "shipped" }),
        Order.countDocuments({ status: "cancelled" }),
      ]);

      res.json({
        registrations: {
          today: regToday,
          yesterday: regYest,
          month: regMonth,
          lastMonth: regLastMonth,
        },
        stores: {
          today: storeToday,
          yesterday: storeYest,
          month: storeMonth,
          lastMonth: storeLastMonth,
        },
        recharge: {
          today: rcToday,
          yesterday: rcYest,
          month: rcMonth,
          lastMonth: rcLastMonth,
        },
        rechargeCount: {
          today: rcCntToday,
          yesterday: rcCntYest,
          month: rcCntMonth,
          lastMonth: rcCntLastMonth,
        },
        withdrawal: {
          today: wdToday,
          yesterday: wdYest,
          month: wdMonth,
          lastMonth: wdLastMonth,
        },
        profit: {
          today: prToday,
          yesterday: prYest,
          month: prMonth,
          lastMonth: prLastMonth,
        },
        orders: {
          completed: ordCompleted,
          pending: ordPending,
          shipped: ordShipped,
          cancelled: ordCancelled,
        },
      });
    } catch (err) {
      console.error("Admin stats error:", err);
      res.status(500).json({ message: "Server error" });
    }
  },
);

export default router;
