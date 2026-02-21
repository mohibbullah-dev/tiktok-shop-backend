import express from "express";
import {
  getQuestions,
  getQuestionById,
  createQuestion,
  updateQuestion,
  deleteQuestion,
  seedQuestions,
  getContract,
} from "../controllers/question.controller.js";
import { protect, authorize } from "../middleware/auth.middleware.js";

const router = express.Router();

// Public
router.get("/", getQuestions);
router.get("/:id", getQuestionById);

// Admin only
router.post("/seed", protect, authorize("superAdmin"), seedQuestions);
router.post("/", protect, authorize("superAdmin"), createQuestion);
router.put("/:id", protect, authorize("superAdmin"), updateQuestion);
router.delete("/:id", protect, authorize("superAdmin"), deleteQuestion);
router.get("/contract", protect, getContract);
export default router;
