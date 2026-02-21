import cron from "node-cron";
import Order from "../models/order.model.js";
import Merchant from "../models/merchant.model.js";
import Transaction from "../models/transaction.model.js";

// Runs every hour — checks for expired orders
export const startCronJobs = () => {
  // Check order pickup deadlines every hour
  cron.schedule("0 * * * *", async () => {
    console.log("Running order timeout check...");

    try {
      const now = new Date();

      // Find orders past pickup deadline still pending
      const expiredOrders = await Order.find({
        status: "pendingPayment",
        pickupDeadline: { $lt: now },
      });

      for (const order of expiredOrders) {
        order.status = "cancelled";
        order.frozenStatus = "timeout";
        await order.save();
        console.log(`Order ${order.orderSn} cancelled due to timeout`);
      }

      console.log(`${expiredOrders.length} expired orders cancelled`);
    } catch (error) {
      console.error("Cron job error:", error);
    }
  });

  console.log("Cron jobs started");
};
