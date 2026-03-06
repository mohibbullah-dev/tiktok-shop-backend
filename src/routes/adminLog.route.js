import express from "express";
import { getAdminLogs } from "../controllers/adminLog.controller.js";
import { protect } from "../middleware/auth.middleware.js";

const router = express.Router();

router.get("/", protect, getAdminLogs);

export default router;
