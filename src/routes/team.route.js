import express from "express";
import { getTeamTree } from "../controllers/team.controller.js";
import { protect, authorize } from "../middleware/auth.middleware.js";

const router = express.Router();

// Allow superAdmin and merchantAdmin to view the tree
router.get("/", protect, authorize("superAdmin", "merchantAdmin"), getTeamTree);

export default router;
