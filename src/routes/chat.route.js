import express from "express";
import {
  getOrCreateRoom,
  getChatHistory,
  getAllRooms,
  getUnclaimedRooms,
  assignAgent,
  autoAssignRooms,
  toggleBlacklist,
  getBlacklist,
  createGroup,
  getGroups,
  addToGroup,
  deleteGroup,
  toggleSound,
  closeRoom,
  markRoomAsRead,
} from "../controllers/chat.controller.js";
import { protect, authorize } from "../middleware/auth.middleware.js";

const router = express.Router();

const adminRoles = ["superAdmin", "merchantAdmin"];

// Merchant routes
router.get("/room", protect, authorize("merchant"), getOrCreateRoom);

// Admin — rooms
router.get("/rooms", protect, authorize(...adminRoles), getAllRooms);
router.get(
  "/rooms/unclaimed",
  protect,
  authorize(...adminRoles),
  getUnclaimedRooms,
);
router.get("/rooms/blacklist", protect, authorize(...adminRoles), getBlacklist);
router.put(
  "/rooms/auto-assign",
  protect,
  authorize(...adminRoles),
  autoAssignRooms,
);
router.put(
  "/rooms/:roomId/assign",
  protect,
  authorize(...adminRoles),
  assignAgent,
);
router.put(
  "/rooms/:roomId/close",
  protect,
  authorize(...adminRoles),
  closeRoom,
);
router.put(
  "/rooms/:roomId/blacklist",
  protect,
  authorize(...adminRoles),
  toggleBlacklist,
);

// Admin — groups
router.get("/groups", protect, authorize(...adminRoles), getGroups);
router.post("/groups", protect, authorize(...adminRoles), createGroup);
router.put(
  "/groups/:groupId/add",
  protect,
  authorize(...adminRoles),
  addToGroup,
);
router.delete(
  "/groups/:groupId",
  protect,
  authorize(...adminRoles),
  deleteGroup,
);

// Admin — settings
router.put("/sound", protect, authorize(...adminRoles), toggleSound);

// Shared
router.get(
  "/messages/:roomId",
  protect,
  authorize("merchant", ...adminRoles),
  getChatHistory,
);
router.put(
  "/rooms/:roomId/read",
  protect,
  authorize("merchant", ...adminRoles),
  markRoomAsRead,
);

export default router;
