import AdminLog from "../models/adminLog.model.js";

// @desc    Get logs for the logged-in admin
// @route   GET /api/admin-logs
// @access  Private
export const getAdminLogs = async (req, res) => {
  try {
    const { page = 1, limit = 15 } = req.query;

    // Fetch logs only for the currently logged-in user
    const filter = { user: req.user._id };

    const total = await AdminLog.countDocuments(filter);
    const logs = await AdminLog.find(filter)
      .sort({ createdAt: -1 })
      .skip((page - 1) * limit)
      .limit(Number(limit));

    res.json({
      logs,
      total,
      page: Number(page),
      pages: Math.ceil(total / limit),
    });
  } catch (error) {
    res.status(500).json({ message: "Server Error" });
  }
};

// Helper function you can import into OTHER controllers to record actions
export const createLog = async (userId, action, details = "") => {
  try {
    await AdminLog.create({ user: userId, action, details });
  } catch (error) {
    console.error("Failed to create admin log:", error);
  }
};
