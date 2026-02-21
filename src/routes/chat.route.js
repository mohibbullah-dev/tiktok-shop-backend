import express from "express";
import {
  getOrCreateRoom,
  getChatHistory,
  getAllRooms,
  assignAgent,
  closeRoom,
  markRoomAsRead,
} from "../controllers/chat.controller.js";
import { protect, authorize } from "../middleware/auth.middleware.js";

const router = express.Router();

// Merchant routes
router.get("/room", protect, authorize("merchant"), getOrCreateRoom);

// Admin routes
router.get(
  "/rooms",
  protect,
  authorize("superAdmin", "merchantAdmin"),
  getAllRooms,
);

router.put(
  "/rooms/:roomId/assign",
  protect,
  authorize("superAdmin", "merchantAdmin"),
  assignAgent,
);

router.put(
  "/rooms/:roomId/close",
  protect,
  authorize("superAdmin", "merchantAdmin"),
  closeRoom,
);

// Shared
router.get(
  "/messages/:roomId",
  protect,
  authorize("merchant", "superAdmin", "merchantAdmin"),
  getChatHistory,
);

router.put(
  "/rooms/:roomId/read",
  protect,
  authorize("merchant", "superAdmin", "merchantAdmin"),
  markRoomAsRead,
);

export default router;
