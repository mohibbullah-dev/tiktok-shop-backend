import express from "express";
import {
  dispatchOrder,
  dispatchBulkOrders,
  pickupOrder,
  getAllOrders,
  getMyOrders,
  getOrderById,
  confirmOrderProfit,
  cancelOrder,
  bulkShipOrders,
  bulkCompleteOrders,
} from "../controllers/order.controller.js";
import { protect, authorize } from "../middleware/auth.middleware.js";

const router = express.Router();

// Merchant routes
router.get("/my-orders", protect, authorize("merchant"), getMyOrders);
router.put("/:id/pickup", protect, authorize("merchant"), pickupOrder);

// Dispatch admin routes
router.post("/dispatch", protect, authorize("dispatchAdmin"), dispatchOrder);
router.post(
  "/dispatch-bulk",
  protect,
  authorize("dispatchAdmin"),
  dispatchBulkOrders,
);

// Bulk operations (admin)
router.put(
  "/bulk-ship",
  protect,
  authorize("superAdmin", "dispatchAdmin"),
  bulkShipOrders,
);
router.put(
  "/bulk-complete",
  protect,
  authorize("superAdmin"),
  bulkCompleteOrders,
);

// Admin + merchant shared
router.get(
  "/",
  protect,
  authorize("superAdmin", "merchantAdmin", "dispatchAdmin"),
  getAllOrders,
);
router.get(
  "/:id",
  protect,
  authorize("superAdmin", "merchantAdmin", "dispatchAdmin", "merchant"),
  getOrderById,
);

// SuperAdmin only
router.put(
  "/:id/confirm-profit",
  protect,
  authorize("superAdmin"),
  confirmOrderProfit,
);
router.put("/:id/cancel", protect, authorize("superAdmin"), cancelOrder);

export default router;
