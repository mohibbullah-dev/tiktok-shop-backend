// import cron from "node-cron";
// import Order from "../models/order.model.js";
// import Merchant from "../models/merchant.model.js";
// import Transaction from "../models/transaction.model.js";

// // Runs every hour — checks for expired orders
// export const startCronJobs = () => {
//   // Check order pickup deadlines every hour
//   cron.schedule("0 * * * *", async () => {
//     console.log("Running order timeout check...");

//     try {
//       const now = new Date();

//       // Find orders past pickup deadline still pending
//       const expiredOrders = await Order.find({
//         status: "pendingPayment",
//         pickupDeadline: { $lt: now },
//       });

//       for (const order of expiredOrders) {
//         order.status = "cancelled";
//         order.frozenStatus = "timeout";
//         await order.save();
//         console.log(`Order ${order.orderSn} cancelled due to timeout`);
//       }

//       console.log(`${expiredOrders.length} expired orders cancelled`);
//     } catch (error) {
//       console.error("Cron job error:", error);
//     }
//   });

//   console.log("Cron jobs started");
// };

/////////////////////////// ============= cronJobs  =============== //////////////////////////////////////////
// backend/cron/cronJobs.js
//
// ─── PHASE 7: CRON JOBS ──────────────────────────────────────────────────────
//
// This file contains ALL scheduled background tasks for the system.
// Import this file in server.js ONCE — it self-starts all jobs.
//
// JOBS:
//   1. orderDeliveryTimer     → every 10 minutes
//      After merchant pickups an order, the countdown starts.
//      When completionDays have passed since pickedUpAt:
//        - status: pendingShipment → shipped
//      This simulates the order progressing through logistics automatically.
//
//   2. orderAutoComplete      → every 10 minutes
//      After an order is shipped, we auto-move it to 'received' after
//      a short buffer (so the superAdmin can then confirm profit).
//      status: shipped → received
//
//   3. attendanceReset        → every day at midnight (00:00)
//      Resets "claimed today" tracking so merchants can sign in again.
//      (The Attendance model tracks this via lastClaimDate)
//
//   4. trafficTaskExpiry      → every hour
//      Traffic tasks have a deadline. Expired active tasks → 'expired'.
//
//   5. pickupDeadlineChecker  → every 30 minutes
//      Orders not picked up before pickupDeadline → auto-cancelled.
//      Balance is NOT affected (order was never picked up = no charge).
//
// USAGE in server.js:
//   import { startCronJobs } from './cron/cronJobs.js'
//   startCronJobs()
//
// ─────────────────────────────────────────────────────────────────────────────

import cron from "node-cron";
import Order from "../models/order.model.js";
import TrafficTask from "../models/trafficTask.model.js";
// import Order from "../models/Order.js";
// import Merchant from "../models/Merchant.js";
// import Transaction from "../models/Transaction.js";
// import TrafficTask from "../models/TrafficTask.js";

// ─── Helper: log with timestamp ───────────────────────────────
const log = (job, msg) => {
  console.log(`[CRON][${job}][${new Date().toISOString()}] ${msg}`);
};

// ─────────────────────────────────────────────────────────────
// JOB 1: Order Delivery Timer
// Runs: every 10 minutes
//
// Logic:
//   - Find all orders with status 'pendingShipment'
//   - Check if pickedUpAt + completionDays has passed
//   - If yes → advance to 'shipped'
//
// Example: merchant picks up at 09:00, completionDays=1
//   → at 09:00 next day, cron auto-sets status to 'shipped'
// ─────────────────────────────────────────────────────────────
const runOrderDeliveryTimer = async () => {
  try {
    const now = new Date();

    // Find all orders that:
    // - are still in pendingShipment (merchant picked up but not shipped yet)
    // - have a pickedUpAt date
    const orders = await Order.find({
      status: "pendingShipment",
      pickedUpAt: { $ne: null },
    });

    let advanced = 0;

    for (const order of orders) {
      // Calculate when delivery should complete:
      // pickedUpAt + completionDays (in milliseconds)
      const deliveryDue = new Date(
        order.pickedUpAt.getTime() + order.completionDays * 24 * 60 * 60 * 1000,
      );

      // If delivery due time has passed → ship it
      if (now >= deliveryDue) {
        order.status = "shipped";

        // Add a logistics entry to show it shipped
        order.logisticsInfo.push({
          status: "Package shipped by courier",
          time: now,
        });

        await order.save();
        advanced++;
        log("orderDeliveryTimer", `Order ${order.orderSn} → shipped`);
      }
    }

    if (advanced > 0) {
      log("orderDeliveryTimer", `Advanced ${advanced} order(s) to shipped`);
    }
  } catch (error) {
    log("orderDeliveryTimer", `ERROR: ${error.message}`);
  }
};

// ─────────────────────────────────────────────────────────────
// JOB 2: Order Auto-Complete (shipped → received)
// Runs: every 10 minutes
//
// Logic:
//   - Find all 'shipped' orders
//   - After 24 hours of being shipped → mark as 'received'
//   - This makes them eligible for superAdmin to confirm profit
//
// NOTE: Profit is NOT added here. That still requires manual
//       superAdmin action (PUT /api/orders/:id/confirm-profit)
// ─────────────────────────────────────────────────────────────
const runOrderAutoComplete = async () => {
  try {
    const now = new Date();
    // Orders that shipped more than 24 hours ago
    const cutoff = new Date(now.getTime() - 24 * 60 * 60 * 1000);

    const orders = await Order.find({
      status: "shipped",
      updatedAt: { $lte: cutoff }, // updatedAt was when status became 'shipped'
    });

    let received = 0;

    for (const order of orders) {
      order.status = "received";

      order.logisticsInfo.push({
        status: "Package delivered to buyer",
        time: now,
      });

      await order.save();
      received++;
      log("orderAutoComplete", `Order ${order.orderSn} → received`);
    }

    if (received > 0) {
      log("orderAutoComplete", `Marked ${received} order(s) as received`);
    }
  } catch (error) {
    log("orderAutoComplete", `ERROR: ${error.message}`);
  }
};

// ─────────────────────────────────────────────────────────────
// JOB 3: Pickup Deadline Checker
// Runs: every 30 minutes
//
// Logic:
//   - Find 'pendingPayment' orders where pickupDeadline has passed
//   - Auto-cancel them
//   - NO balance deduction (merchant never paid, no charge)
//   - Merchant's balance is safe
//
// The pickupDeadline is set by the dispatchAdmin when creating
// the order (usually 24-48 hours to pick up).
// ─────────────────────────────────────────────────────────────
const runPickupDeadlineChecker = async () => {
  try {
    const now = new Date();

    // Find orders that:
    // - merchant hasn't picked up yet (pendingPayment)
    // - pickup deadline has passed
    const expiredOrders = await Order.find({
      status: "pendingPayment",
      pickupDeadline: { $ne: null, $lte: now },
    });

    let cancelled = 0;

    for (const order of expiredOrders) {
      order.status = "cancelled";
      // frozenStatus tracks the reason
      order.frozenStatus = "expired_pickup";
      await order.save();
      cancelled++;
      log(
        "pickupDeadlineChecker",
        `Order ${order.orderSn} → cancelled (pickup deadline expired)`,
      );
    }

    if (cancelled > 0) {
      log("pickupDeadlineChecker", `Cancelled ${cancelled} expired orders`);
    }
  } catch (error) {
    log("pickupDeadlineChecker", `ERROR: ${error.message}`);
  }
};

// ─────────────────────────────────────────────────────────────
// JOB 4: Traffic Task Expiry
// Runs: every hour
//
// Logic:
//   - Traffic tasks have a 'deadline' field
//   - If deadline passed and task is still 'active' → 'expired'
//   - Merchants assigned to expired tasks stay assigned
//     (they just can't complete it after expiry)
// ─────────────────────────────────────────────────────────────
const runTrafficTaskExpiry = async () => {
  try {
    const now = new Date();

    const result = await TrafficTask.updateMany(
      {
        status: "active",
        deadline: { $ne: null, $lte: now },
      },
      { status: "expired" },
    );

    if (result.modifiedCount > 0) {
      log(
        "trafficTaskExpiry",
        `Expired ${result.modifiedCount} traffic task(s)`,
      );
    }
  } catch (error) {
    log("trafficTaskExpiry", `ERROR: ${error.message}`);
  }
};

// ─────────────────────────────────────────────────────────────
// JOB 5: Daily Stats Snapshot (optional — midnight)
// Runs: every day at 00:05
//
// Logic:
//   - Resets daily counters if any are needed
//   - Currently: logs system health stats
//   - Can be extended to build daily revenue reports
// ─────────────────────────────────────────────────────────────
const runDailySnapshot = async () => {
  try {
    const [pendingOrders, activeOrders, completedToday] = await Promise.all([
      Order.countDocuments({ status: "pendingPayment" }),
      Order.countDocuments({ status: { $in: ["pendingShipment", "shipped"] } }),
      Order.countDocuments({
        status: "completed",
        completedAt: {
          $gte: new Date(new Date().setHours(0, 0, 0, 0)),
        },
      }),
    ]);

    log(
      "dailySnapshot",
      [
        `Pending: ${pendingOrders}`,
        `Active: ${activeOrders}`,
        `Completed today: ${completedToday}`,
      ].join(" | "),
    );
  } catch (error) {
    log("dailySnapshot", `ERROR: ${error.message}`);
  }
};

// ─────────────────────────────────────────────────────────────
// EXPORT: startCronJobs()
// Call this once in server.js after DB connects
// ─────────────────────────────────────────────────────────────
export const startCronJobs = () => {
  console.log("[CRON] Starting all cron jobs...");

  // ── Job 1: Order delivery timer — every 10 minutes ────────
  // '*/10 * * * *' = at minute 0, 10, 20, 30, 40, 50 of every hour
  cron.schedule("*/10 * * * *", runOrderDeliveryTimer, {
    scheduled: true,
    timezone: "UTC",
  });
  console.log("[CRON] ✅ orderDeliveryTimer → every 10 minutes");

  // ── Job 2: Auto-complete shipped orders — every 10 minutes ─
  cron.schedule("*/10 * * * *", runOrderAutoComplete, {
    scheduled: true,
    timezone: "UTC",
  });
  console.log("[CRON] ✅ orderAutoComplete → every 10 minutes");

  // ── Job 3: Pickup deadline checker — every 30 minutes ─────
  // '*/30 * * * *' = at minute 0 and 30 of every hour
  cron.schedule("*/30 * * * *", runPickupDeadlineChecker, {
    scheduled: true,
    timezone: "UTC",
  });
  console.log("[CRON] ✅ pickupDeadlineChecker → every 30 minutes");

  // ── Job 4: Traffic task expiry — every hour ────────────────
  // '0 * * * *' = at minute 0 of every hour (e.g. 09:00, 10:00, ...)
  cron.schedule("0 * * * *", runTrafficTaskExpiry, {
    scheduled: true,
    timezone: "UTC",
  });
  console.log("[CRON] ✅ trafficTaskExpiry → every hour");

  // ── Job 5: Daily snapshot — every day at 00:05 ────────────
  // '5 0 * * *' = at 00:05 every day
  cron.schedule("5 0 * * *", runDailySnapshot, {
    scheduled: true,
    timezone: "UTC",
  });
  console.log("[CRON] ✅ dailySnapshot → daily at 00:05 UTC");

  console.log("[CRON] All jobs running ✅");
};
