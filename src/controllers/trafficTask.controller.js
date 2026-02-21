import TrafficTask from "../models/trafficTask.model.js";
import Merchant from "../models/merchant.model.js";

// ─────────────────────────────────────────
// @desc    Create traffic task for merchant
// @route   POST /api/traffic-tasks
// @access  superAdmin only
// ─────────────────────────────────────────
export const createTrafficTask = async (req, res) => {
  const {
    merchantId,
    startExecutionTime,
    executionDuration,
    traffic,
    taskInformation,
  } = req.body;

  const merchant = await Merchant.findOne({ merchantId });
  if (!merchant) {
    return res.status(404).json({ message: "Merchant not found" });
  }

  const task = await TrafficTask.create({
    merchant: merchant._id,
    assignedBy: req.user._id,
    startExecutionTime: startExecutionTime || new Date(),
    executionDuration: executionDuration || 43200,
    traffic: traffic || 0,
    completedTraffic: 0,
    taskInformation: taskInformation || "",
    status: "inProgress",
  });

  res.status(201).json({ message: "Traffic task created", task });
};

// ─────────────────────────────────────────
// @desc    Get all traffic tasks
// @route   GET /api/traffic-tasks
// @access  superAdmin only
// ─────────────────────────────────────────
export const getAllTrafficTasks = async (req, res) => {
  const { status, merchantId, page = 1, limit = 10 } = req.query;

  const filter = {};
  if (status) filter.status = status;

  if (merchantId) {
    const merchant = await Merchant.findOne({ merchantId });
    if (merchant) filter.merchant = merchant._id;
  }

  const total = await TrafficTask.countDocuments(filter);

  const tasks = await TrafficTask.find(filter)
    .populate("merchant", "storeName merchantId")
    .sort({ createdAt: -1 })
    .skip((page - 1) * limit)
    .limit(Number(limit));

  res.json({
    tasks,
    total,
    page: Number(page),
    pages: Math.ceil(total / limit),
  });
};

// ─────────────────────────────────────────
// @desc    Update traffic task progress
// @route   PUT /api/traffic-tasks/:id/progress
// @access  superAdmin only
// ─────────────────────────────────────────
export const updateTaskProgress = async (req, res) => {
  const { completedTraffic } = req.body;

  const task = await TrafficTask.findById(req.params.id);
  if (!task) {
    return res.status(404).json({ message: "Task not found" });
  }

  task.completedTraffic = completedTraffic;

  // Auto complete if traffic goal reached
  if (completedTraffic >= task.traffic) {
    task.status = "executionCompleted";
  }

  await task.save();
  res.json({ message: "Task progress updated", task });
};

// ─────────────────────────────────────────
// @desc    End traffic task manually
// @route   PUT /api/traffic-tasks/:id/end
// @access  superAdmin only
// ─────────────────────────────────────────
export const endTask = async (req, res) => {
  const task = await TrafficTask.findById(req.params.id);
  if (!task) {
    return res.status(404).json({ message: "Task not found" });
  }

  task.status = "ended";
  await task.save();

  res.json({ message: "Task ended", task });
};

// ─────────────────────────────────────────
// @desc    Get merchant's own traffic tasks
// @route   GET /api/traffic-tasks/my-tasks
// @access  merchant only
// ─────────────────────────────────────────
export const getMyTrafficTasks = async (req, res) => {
  const merchant = await Merchant.findOne({ user: req.user._id });
  if (!merchant) {
    return res.status(404).json({ message: "Merchant not found" });
  }

  const tasks = await TrafficTask.find({ merchant: merchant._id }).sort({
    createdAt: -1,
  });

  res.json(tasks);
};
