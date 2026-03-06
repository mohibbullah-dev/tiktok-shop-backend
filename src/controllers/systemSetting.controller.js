// import SystemSetting from "../models/systemSetting.model.js";

import SystemSetting from "../models/SystemSetting.model.js";

// @desc    Get global system settings
// @route   GET /api/settings
// @access  Public (Merchant app needs to read this before login sometimes)
export const getSettings = async (req, res) => {
  try {
    let settings = await SystemSetting.findOne();
    // If no settings exist yet, create a default one automatically
    if (!settings) {
      settings = await SystemSetting.create({});
    }
    res.json(settings);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// @desc    Update global system settings
// @route   PUT /api/settings
// @access  SuperAdmin only
export const updateSettings = async (req, res) => {
  try {
    let settings = await SystemSetting.findOne();
    if (!settings) {
      settings = await SystemSetting.create({});
    }

    // Update all fields provided in the body
    Object.assign(settings, req.body);
    await settings.save();

    res.json({ message: "System settings updated successfully", settings });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};
