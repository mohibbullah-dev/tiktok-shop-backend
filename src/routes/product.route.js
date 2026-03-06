import express from "express";
import {
  getDistributionProducts,
  distributeProduct,
  distributeBulk,
  getMyProducts,
  getProductById,
  toggleProduct,
  getAllProductsAdmin,
  toggleRecommend,
  getTopSelling,
  toggleProductAdmin,
  createDistributionProduct,
  updateDistributionProduct,
  deleteDistributionProduct,
} from "../controllers/product.controller.js";
import { protect, authorize } from "../middleware/auth.middleware.js";

const router = express.Router();

// Merchant routes
router.get(
  "/distribution",
  protect,
  authorize("merchant"),
  getDistributionProducts,
);
router.post(
  "/distribute/:productId",
  protect,
  authorize("merchant"),
  distributeProduct,
);
router.post("/distribute-bulk", protect, authorize("merchant"), distributeBulk);
router.get("/my-products", protect, authorize("merchant"), getMyProducts);
router.get("/top-selling", protect, authorize("merchant"), getTopSelling);
router.put("/:id/toggle", protect, authorize("merchant"), toggleProduct);

// Admin routes
router.get(
  "/admin",
  protect,
  authorize("superAdmin", "dispatchAdmin"),
  getAllProductsAdmin,
);
router.put("/:id/recommend", protect, authorize("superAdmin"), toggleRecommend);

// ADD THIS NEW ROUTE HERE:
router.put(
  "/:id/toggle-admin",
  protect,
  authorize("superAdmin", "dispatchAdmin"),
  toggleProductAdmin,
);

// Admin routes
router.get(
  "/admin",
  protect,
  authorize("superAdmin", "dispatchAdmin"),
  getAllProductsAdmin,
);

router.post(
  "/admin",
  protect,
  authorize("superAdmin", "dispatchAdmin"),
  createDistributionProduct,
);
router.put(
  "/admin/:id",
  protect,
  authorize("superAdmin", "dispatchAdmin"),
  updateDistributionProduct,
);
router.delete(
  "/admin/:id",
  protect,
  authorize("superAdmin", "dispatchAdmin"),
  deleteDistributionProduct,
);

router.put("/:id/recommend", protect, authorize("superAdmin"), toggleRecommend);

// Shared
router.get("/:id", protect, getProductById);

export default router;
