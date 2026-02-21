import express from "express";
import {
  sendNotice,
  getAllNotices,
  getMyNotices,
  markAsSeen,
  updateNotice,
  deleteNotice,
} from "../controllers/notice.model.js";
import { protect, authorize } from "../middleware/auth.middleware.js";

const router = express.Router();

router.get("/my-notices", protect, authorize("merchant"), getMyNotices);
router.put("/:id/seen", protect, authorize("merchant"), markAsSeen);

router.post("/", protect, authorize("superAdmin", "merchantAdmin"), sendNotice);
router.get(
  "/",
  protect,
  authorize("superAdmin", "merchantAdmin"),
  getAllNotices,
);
router.put(
  "/:id",
  protect,
  authorize("superAdmin", "merchantAdmin"),
  updateNotice,
);
router.delete("/:id", protect, authorize("superAdmin"), deleteNotice);

export default router;
