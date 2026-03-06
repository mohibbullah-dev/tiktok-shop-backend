import express from "express";
import {
  getAdmins,
  createAdmin,
  deleteAdmin,
} from "../controllers/adminManagement.controller.js";
import { protect, authorize } from "../middleware/auth.middleware.js";

const router = express.Router();

// All routes here are strictly for the superAdmin
router.use(protect, authorize("superAdmin"));

router.route("/").get(getAdmins).post(createAdmin);

router.route("/:id").delete(deleteAdmin);

export default router;
